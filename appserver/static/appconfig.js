define(['underscore', 'backbone', 'splunk.util'], function(_, Backbone, SplunkUtil) {

    var AppConfig = Backbone.Model.extend({
        url: SplunkUtil.make_url('/custom/maps/mapsconfig/config'),
        load: _.once(function() {
            return this.fetch();
        })
    });

    return new AppConfig();
});
