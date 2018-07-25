/*****************************************************************************/
/* AdminMap: Event Handlers */
/*****************************************************************************/
Template.AdminMap.events({
    /*'click #legendTable tr'(event, target){

        //When the legend is clicked, update the user's primary station to the one clicked.

        let stationName = $(event.target).text() || $(event.target).find('span').text();
        Meteor.users.update(Meteor.userId(), {
        $set: {'profile.primaryStation': stationName}
        }, {multi:true});
        }*/
});

/*****************************************************************************/
/* AdminMap: Helpers */
/*****************************************************************************/
Template.AdminMap.helpers({
    imageName(){
        return Meteor.user().profile.primaryStation.replace(/\s/g,'');
        // return null
    }
});

/*****************************************************************************/
/* AdminMap: Lifecycle Hooks */
/*****************************************************************************/
Template.AdminMap.onCreated(function(){
});

Template.AdminMap.onRendered(function(){
    try {
        let stations = Stations.find({}).fetch(),
            primaryStation = Stations.findOne({title: Meteor.user().profile.primaryStation});

        //Map Initialization
        let map = L.map('map').setView([primaryStation.lat,primaryStation.lon], 8);
        // map.createPane('labels');
        L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicnBzbWFrYSIsImEiOiJjaWo4dDU5ZHAwMDFjdXNtNG5lejd0Z2ZuIn0.zsH1hJed8Fda2Tlku3hRgg', {
            maxZoom: 13,
            attribution: 'Data Fountain',
            id: 'mapbox.streets'
        }).addTo(map);

        for(i=0;i<stations.length;i++)
        {
            let lat=Number(stations[i].lat);//latitude
            let long=Number(stations[i].lon);//longitude
            let stationName = stations[i].title;

            //Adding a point
            L.circleMarker([lat, long], {
                radius: 4,
                color: 'red',
                fillColor: 'red',
                fillOpacity: 1
            }).bindLabel(stationName, {
                direction: "auto",
                noHide: true,
                className: "circle-marker-label"
            }).addTo(map);
        }


    } catch(exception) {
        console.log(exception);
    }
});


Template.AdminMap.onDestroyed(function(){
});

