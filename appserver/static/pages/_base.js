define([
    "underscore",
    "backbone",
    "splunkjs/mvc",
    "splunkjs/mvc/headerview",
    "splunkjs/mvc/footerview",
    "splunkjs/mvc/simplexml/router",
    "splunkjs/mvc/simplexml/dashboardurl",
    "util/router_utils",
    "splunkjs/mvc/sharedmodels",
    "splunkjs/mvc/utils"
], function(_, Backbone, mvc, HeaderView, FooterView, DashboardRouter, DashboardUrl, RouterUtils, SharedModels, Utils){

    var stateModel = new Backbone.Model();

    function initRouter() {
        var router = new DashboardRouter({
            model: stateModel,
            app: SharedModels.get('app'),
            serverInfo: SharedModels.get('serverInfo')
        });
        RouterUtils.start_backbone_history();
        return router;
    }

    var initPage = function(){
        new HeaderView({
            id: 'header',
            section: 'dashboards',
            el: $('.header'),
            acceleratedAppNav: true,
            useSessionStorageCache: true
        }, {tokens: true}).render();

        new FooterView({
            id: 'footer',
            el: $('.footer')
        }, {tokens: true}).render();
    };

    var updateDashboardUrl = function(options) {
        console.log('Updating URL', { replaceState: options.replaceState === true });
        DashboardUrl.save(null, { replaceState: options.replaceState === true });
    };
    
    var stateSyncer = null;
    var syncState = function(options) {
        if (stateSyncer) {
            DashboardUrl.off(null, null, stateSyncer);
            stateSyncer.destroy();
        }
        stateSyncer = Utils.syncModels(stateModel, DashboardUrl, _.extend({
            auto: true,
            exclude: ['edit']
        }, options));
        
        DashboardUrl.on('change', _.debounce(_.bind(updateDashboardUrl, null, options)), stateSyncer);
    };
    
    return {
        stateModel: stateModel,
        urlModel: DashboardUrl,
        initRouter: initRouter,
        initPage: initPage,
        syncState: syncState
    };
});