require([
    'underscore', 'jquery', 'splunkjs/mvc',
    'app/maps/pages/_base',
    'splunkjs/mvc/searchmanager',
    'splunkjs/mvc/searchbarview',
    'splunkjs/mvc/searchcontrolsview',
    'app/maps/components/map/map',
    'app/maps/appconfig'
], function(_, $, mvc, BasePage, SearchManager, SearchBarView, SearchControlsView, Map, Config) {

    BasePage.initRouter();
    BasePage.initPage();
    BasePage.syncState({ replaceState: true });

    var state = BasePage.stateModel;

    var search = new SearchManager({
        id: 'main-search',
        app: 'maps',
        "cancelOnUnload": true,
        "auto_cancel": 90,
        "preview": true,
        "runWhenTimeIsUndefined": false
    });

    var $searchbar = $('#searchbar');
    var searchbar = new SearchBarView({
        id: 'main-searchbar',
        managerid: 'main-search',
        autoOpenAssistant: false,
        value: 'sourcetype=access_combined | iplocation clientip | geostats count maxzoomlevel=18'
    });
    searchbar.render().$el.appendTo($searchbar);

    new SearchControlsView({
        id: "main-searchcontrols",
        managerid: "main-search"
    }).render().$el.appendTo($searchbar);

    searchbar.on("change", function() {
        search.settings.unset("search");
        search.settings.set("search", searchbar.val());
        state.set('q', searchbar.val());
    });
    searchbar.timerange.on("change", function() {
        var timerange = searchbar.timerange.val();
        search.settings.set(timerange);
        state.set({
            earliest: timerange.earliest_time,
            latest: timerange.latest_time
        });
    });

    function updateFromUrl() {
        searchbar.val(state.get('q'));
        searchbar.timerange.val({
            earliest_time: state.get('earliest'),
            latest_time: state.get('latest')
        });
    }

    state.on('change', updateFromUrl);

    if (state.has('q')) {
        updateFromUrl();
    }

    var mapHeightOffset =
        65 + // header
        95 + // searchbar
        (-10) + // negative searchbar margin-top
        32; //footer

    Config.load().then(function() {
        var mapSettings = Config.get('mapsview') || {};
        new Map(_.extend(mapSettings, {
            id: 'map',
            el: $('#map'),
            managerid: 'main-search',
            autoHeight: true,
            windowHeightOffset: mapHeightOffset,
            autoFitBounds: false
        })).render();
    });
});