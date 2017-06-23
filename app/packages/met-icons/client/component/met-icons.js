import SunCalc from 'suncalc';

/*****************************************************************************/
/* MetIcons: Event Handlers */
/*****************************************************************************/
Template.MetIcons.events({
});

/*****************************************************************************/
/* MetIcons: Helpers */
/*****************************************************************************/
Template.MetIcons.helpers({
    weatherIcon() {
        try {
            let weather = Template.instance().weather(),
                time = moment(weather.forecastIo.currently.time * 1000).format(),
                icon = getWeatherIcon(weather.forecastIo.currently.icon, time, weather.forecastIo.latitude, weather.forecastIo.longitude);

            return icon;
        } catch (exception) {
            if (!!exception instanceof TypeError)
                console.log(exception);
        }
    },
    lunarIcon() {
        try {
            let weather = Template.instance().weather(),
                time = moment(weather.forecastIo.currently.time * 1000).format(),
                lunr = getLunarPhaseIcon(time);

            return lunr;
        } catch (exception) {
            if (!!exception instanceof TypeError)
                console.log(exception);
        }
    },
    tempIcon() {
        try {
            let weather = Template.instance().weather(),
                temp = Math.round(weather.ndbc.airTemperature);

            return temp;
        } catch (exception) {
            if (!!exception instanceof TypeError)
                console.log(exception);
        }
    },
    windBearing() {
        try {
            let weather = Template.instance().weather(),
                windDirection = weather.ndbc.windDirection;

            return windDirection;
        } catch (exception) {
            if (!!exception instanceof TypeError)
                console.log(exception);
        }
    },
    windSpeed() {
        try {
            let weather = Template.instance().weather(),
                windSpeed = Math.round(weather.ndbc.windSpeed);

            return windSpeed;
        } catch (exception) {
            if (!!exception instanceof TypeError)
                console.log(exception);
        }
    },
    timeStep() {
        try {
            let weather = Template.instance().weather(),
                timeStep = moment(weather.currently.time*1000).format('DD/MM HH:00');

            return timeStep;
        } catch (exception) {
            if (!!exception instanceof TypeError)
                console.log(exception);
        }

    }
});

/*****************************************************************************/
/* MetIcons: Lifecycle Hooks */
/*****************************************************************************/
Template.MetIcons.onCreated(function() {
    const weatherDep = new Tracker.Dependency;
    let primaryStation = Meteor.user().profile.primaryStation;
    var userHash = Meteor.userId();

    let weatherCollection = Weather.find({owner: userHash}).fetch(),
    //let weatherCollection = Weather.find({}).fetch(),
        dataCollection = Data.findOne({title: primaryStation}, {fields: {'title': 1, 'data.windSpeed': 1, 'data.airTemperature': 1, 'data.windDirection': 1}}),
        weather = {};

    weather.ndbc = {};

    Template.instance().weather = (() => {
        weatherDep.depend();
        return {
            forecastIo: weather.forecastIo[0],
            ndbc: weather.ndbc
        }
    });
    Tracker.autorun(() => {
        // Make sure there is weather data for this user
        if (!weatherCollection || weatherCollection.length == 0) {
            console.log("Could not load weather data for this user");
            return;
        }

        weather.forecastIo = weatherCollection[0].data.filter((obj) => {
            if(obj.currently !== undefined){
                return obj.currently.time === moment(Session.get('globalTimer')).unix();
            }
        });


        Object.keys(dataCollection.data).forEach((item, index) => {
            let timer = Session.get('globalTimer');
            let valueIndex = dataCollection.data[item].times.indexOf(timer);
            weather.ndbc[item] = dataCollection.data[item].values[valueIndex];
        });

        weatherDep.changed();
    });
});

Template.MetIcons.onRendered(function() {
    $('[data-skycon]').each(initSkycon);
});

Template.MetIcons.onDestroyed(function() {
});

(function(window, document, $, undefined){

    window.initSkycon = function(){
        let element = $(this),
            skycons = new Skycons({'color': (element.data('color') || 'white')});

        // element.html('<canvas width="' + element.data('width') + '" height="' + element.data('height') + '"></canvas>');
        element.html('<canvas style="width: ' + element.data('width') + ';"></canvas>');

        skycons.add(element.children()[0], element.data('skycon'));

        skycons.play();
    }

})(window, document, window.jQuery);


const getLunarPhaseIcon = ((datetime) => {
    datetime = new Date(datetime);
    /*
       gets the lunar phase icon from the moon illumination
datetime: moment date time of selected time, eg var datetime = moment()
fraction: 0.0 (new moon) to 1.0 (full moon)
phase: 0.0 to 1.0
*/
    var moonStatus = SunCalc.getMoonIllumination(datetime);
    //Phase Name: 0 New Moon, Waxing Crescent, 0.25  First Quarter, Waxing Gibbous, 0.5 Full Moon, Waning Gibbous, 0.75  Last Quarter, Waning Crescent
    var iconList = ['wi-moon-alt-new', 'wi-moon-alt-waxing-crescent-1', 'wi-moon-alt-waxing-crescent-2', 'wi-moon-alt-waxing-crescent-3', 'wi-moon-alt-waxing-crescent-4', 'wi-moon-alt-waxing-crescent-5', 'wi-moon-alt-waxing-crescent-6', 'wi-moon-alt-first-quarter', 'wi-moon-alt-waxing-gibbous-1', 'wi-moon-alt-waxing-gibbous-2', 'wi-moon-alt-waxing-gibbous-3', 'wi-moon-alt-waxing-gibbous-4', 'wi-moon-alt-waxing-gibbous-5', 'wi-moon-alt-waxing-gibbous-6', 'wi-moon-alt-full', 'wi-moon-alt-waning-gibbous-1', 'wi-moon-alt-waning-gibbous-2', 'wi-moon-alt-waning-gibbous-3', 'wi-moon-alt-waning-gibbous-4', 'wi-moon-alt-waning-gibbous-5', 'wi-moon-alt-waning-gibbous-6', 'wi-moon-alt-third-quarter', 'wi-moon-alt-waning-crescent-1', 'wi-moon-alt-waning-crescent-2', 'wi-moon-alt-waning-crescent-3', 'wi-moon-alt-waning-crescent-4', 'wi-moon-alt-waning-crescent-5', 'wi-moon-alt-waning-crescent-6']
    var step = 1/iconList.length

    var o = d3.scale.linear()
    .domain(d3.range(0,1+step,step))
    .range(d3.range(0,iconList.length+1));


    var idx = Math.floor(o(moonStatus.phase.toFixed(2)));
    return iconList[idx];
});


const getWeatherIcon = ((skycon, datetime, lat, lng) => {
    datetime = moment(datetime);
    /*
       gets the weather icon from the metar data, sky conditions
       */
    //byteValue-meanings: clear,few scattered, broken, overcast
    //byteValue: 0, 1, 3, 5, 8
    //datetime: moment date time of selected time
    //eg var datetime = moment()
    var iconSet = {
        "wi-day":{"clear-day":"wi-day-sunny","partly-cloudy-day":"wi-day-cloudy","wind":"wi-day-cloudy-windy","cloudy":"wi-day-cloudy-high","rain":"wi-day-rain", "sleet": "wi-day-sleet", "fog": "wi-day-fog", "snow": "wi-day-snow"},
        "wi-night":{"clear-night":"wi-night-clear","partly-cloudy-night":"wi-night-cloudy","wind":"wi-night-cloudy-windy","cloudy":"wi-night-cloudy-high","rain":"wi-night-rain", "sleet": "wi-night-sleet", "fog": "wi-night-fog", "snow": "wi-night-snow"}
    }
    var times = SunCalc.getTimes(datetime, lat, lng);
    var icon;
    //is current time in daylight
    if (datetime.isAfter(moment(times.sunrise)) && datetime.isBefore(moment(times.sunset))){
        icon = iconSet['wi-day'][skycon];
    } else {
        icon = iconSet['wi-night'][skycon];
    }
    return icon;
});
