define([
    'underscore',
    'app/maps/components/overlay/splunkoverlay',
    'app/maps/components/leaflet/markers'
], function(_, SplunkOverlay, MarkersLayer) {

    var ClustersOverlay = SplunkOverlay.extend({
        include_bounds: true,
        options: {
            maxClusters: 500
        },
        createLeafletOverlay: function() {
            var overlaySettings = _.omit(this.settings.toJSON(), 'id', 'name', 'maxClusters');
            return new MarkersLayer(_.extend(overlaySettings, {
                onMarkerClick: _.bind(this.onMarkerClick, this)
            }));
        },
        onMarkerClick: function(e) {
            var marker = e.target;
            this.trigger('click', {
                data: _.object(marker._fields, marker._row),
                modifierKey: e.originalEvent.ctrlKey,
                ctrlKey: e.originalEvent.ctrlKey,
                altKey: e.originalEvent.altKey,
                shiftKey: e.originalEvent.shiftKey,
                fields: marker._fields,
                target: marker,
                originalEvent: e.originalEvent
            });
        },
        getName: function() {
            return _('Clusters').t();
        }
    });

    return ClustersOverlay;
});