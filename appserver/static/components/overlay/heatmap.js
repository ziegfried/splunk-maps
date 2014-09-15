define([
    'underscore',
    'app/maps/components/overlay/splunkoverlay',
    'heatmap-leaflet'
], function(_, SplunkOverlay, LeafletHeatmapOverlay) {

    var HeatmapOverlay = SplunkOverlay.extend({
        options: {
            maxClusters: 40000,
            radius: 40,
            sigFactor: 0.02,
            maxOpacity:.7
        },
        createLeafletOverlay: function() {
            var heatmapOptions = _.omit(this.settings.toJSON(), 'id', 'name', 'maxClusters');
            return new LeafletHeatmapOverlay(_.extend(heatmapOptions, { valueField: 'value' }));
        },
        getName: function() {
            return _('Heatmap').t();
        },
        plotData: function(plotData) {
            return SplunkOverlay.prototype.plotData.call(this, _.extend({}, plotData, {
                min: 0,
                max: parseInt(plotData.total * this.settings.get('sigFactor'))
            }));
        }
    });

    return HeatmapOverlay;
});