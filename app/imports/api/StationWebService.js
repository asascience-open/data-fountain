import { Meteor } from 'meteor/meteor';
import { HTTP } from 'meteor/http';
import { EJSON } from 'meteor/ejson';
import { moment } from 'meteor/mrt:moment';

import humps from 'humps';

const Future = Npm.require('fibers/future');

export default class StationWebService {
    constructor() {

    }

    _getTimeStamp() {
        return Math.round(new Date().getTime()/1000);
    }

    fetchStations() {
        console.log('[+] Compiling a collection of stations');
        try {
            const HUMPS = require('humps');

            // go and get the stations, and convert the heathen snake case to
            // glorious camel case.
            let response = HTTP.get(`${Meteor.settings.dataFountainUrl}/api/station_list`),
                snakeData = EJSON.fromJSONValue(response.data.stations),
                data = HUMPS.camelizeKeys(snakeData);

            // time stuff
            let currentUnix = this._getTimeStamp();

            data.forEach((station) => {
                Object.assign(station, {createdAt: currentUnix});
                Stations.upsert({id: station.id}, station);
            });
            console.log('[+] Station compilations complete.');
            return;
        } catch (exception) {
            if (exception.response) {
                // We've caught an exception in the HTTP response, and can handle it.
                let error = {
                    code: exception.response.statusCode,
                    url: process.env.DATA_FOUNTAIN_URL,
                    data: exception.response.data
                };

                console.log(`\r\n\tThere was a problem connecting to OceansMap.\r\n\tOceansMap connection responded with:\n\r\t\t ${EJSON.stringify(error)}\n\r\tMake sure the URL is correct, and that data is flowing.\r\n\tIf the problem persists, you'll need to call for help. The previous stations will be used if possible.`);

            } else if (exception.errno) {
                // We've caught a connection refused error, and can handle it.
                console.log(`\r\n\tWell this is embarrasing . . . it appears that our servers cannot be reached for some reason.  Please try again later: ${exception}`);

            } else {
                // We have no idea what the problem is, and can't even.
                console.log(`${exception}, please make sure settings are configured.`);
            }
        }

    }

    fetchStationsData() {
        console.log(`[+] Compiling a collection of data from stations`);
        try {
            // define our method constants
            const Humps = Npm.require('humps');
            const DATE = new Date();
            const DURATION = Meteor.settings.defaultDuration;

            // set the end date to today.
            let endDate = DATE.toISOString();

            // calculate a new date from the duration
            let startDate = new Date();
            startDate.setHours(startDate.getHours() - DURATION);
            startDate = startDate.toISOString();

            let stationUrls = Stations.find({}, {fields: {dataUrl: 1, id: 1, title: 1}}).fetch();

            // create a place to store the results
            let dataSet = [];

            for (let stationUrl of stationUrls) {
                let data = {};
                let headers;

                // create the URL
                let compiledUrl = `${Meteor.settings.dataFountainUrl}${stationUrl.dataUrl}?time=${startDate}/${endDate}`;
                data.id = stationUrl.id;
                data.title = stationUrl.title;

                // make the call to get the scientific data, and block with future.
                HTTP.call('GET', compiledUrl, (error, response) => {

                    if (error || response.error) {
                        // TODO: Add this into logs.  Not doing it now because logs have not
                        // TODO: been setup for this project.
                        //console.log(`${error} or ${response.error} . . . one of the two. Removing this station.`);
                        Stations.remove({dataUrl: stationUrl.dataUrl});
                    } else {
                        // make the data usable for JavaScript
                        Object.assign(data, Humps.camelizeKeys(response.data));

                        // keep the headers
                        Object.assign(data, response.headers);

                        Data.upsert({id: data.id}, data);
                    }
                });
            }

            console.log(`[+] Station Data compilations complete.`);
            return;
            // when the future is ready, return the data.
        } catch(exception) {
            //debugger;
            console.log(exception);
            return exception;
        }
    }

    fetchWeatherForecast() {
        try {
            // These are server settings, and should be configured via the user profile.
            const FORECAST_API = process.env.FORECAST_API || Meteor.settings.forecastIoApi;
            const DURATION = Meteor.settings.defaultDuration;
            const COORD = process.env.FORECAST_COORD || Meteor.settings.forecastIoApi;
            let referenceStation = Data.find({}, {fields: {'data.times': 1}}).fetch();

            // We don't want to force a station to reference, so lets just get the times
            // form any available station.  Loop through each and exit when we find
            // any valid time array.
            let timeSet = undefined,
                killLoop = referenceStation.length - 1,
                i = 0;

            do {
                timeSet = referenceStation[i].data.times;
                i++;

                // In case all the stations are invalid, lets not create an infinite loop.
                // Also, if that's the case, kill the server.
                if (i === killLoop) process.exit(1);

            } while(!timeSet);

            let weather = Weather.find({}).fetch();

            let removeCount = Weather.remove({'currently.time': {$lte: moment().subtract(DURATION, 'hours').unix()}});
            if (weather.length === 0 && removeCount === 0) {
                for (let i=0; i < timeSet.length -1; i++) {
                    let url = `https://api.forecast.io/forecast/${FORECAST_API}/${COORD[0]},${COORD[1]},${timeSet[i]}`;
                    HTTP.get(url, (error, response) => {
                        if (error) {
                            console.log(`fetchWeatherForecast ${error}`);
                        } else {
                            Weather.insert(response.data);
                        }
                    });
                }
            } else {
                let mm = timeSet[0];
                if (removeCount !== 0) {
                    for (let i=0; i < removeCount; i++) {
                        let recentTimeIndex = timeSet.length - i,
                            timeRequest = timeSet[recentTimeIndex -1];
                        let url = `https://api.forecast.io/forecast/${FORECAST_API}/${COORD[0]},${COORD[1]},${timeRequest}`;
                        HTTP.get(url, (error, response) => {
                            if (error) {
                                console.log(`fetchWeatherForecast ${error}`);
                            } else {
                                Weather.insert(response.data);
                            }
                        });
                    }
                }
            }
        } catch (exception) {
            console.log('There was an error, trying again in 10 seconds');
            console.log(exception);
            Meteor.setTimeout(() => {
                this.fetchWeatherForecast();
            }, 10000);
        }

    }
}
