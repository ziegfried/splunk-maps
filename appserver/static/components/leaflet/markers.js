define(['underscore', 'leaflet-src', 'app/maps/components/leaflet/canvasicon'], function(_, L, CanvasIcon) {

    if (typeof L.Layer === 'undefined') {
        L.Layer = L.Class;
    }

    var MarkersOverlay = L.Layer.extend({
        options: {
            minSize: 45,
            maxSize: 100,
            markerColors: ['#008cff', '#ffbf00', '#ff0000', '#ff00ed']
        },
        initialize: function(options) {
            L.setOptions(this, options);
            this._data = [];
            this._markers = [];
        },
        _getMarkerSize: function getMarkerSize(value, minVal, maxVal) {
            var min = this.options.minSize, range = this.options.maxSize - min;
            return min + parseInt(range * Math.log(value - minVal) / Math.log(maxVal - minVal));
        },
        _formatMarkerValue: function formatMarkerValue(value) {
            if (value > 999999) return ((value / 1000000).toFixed(0) + "M");
            else if (value > 9999) return ((value / 1000).toFixed(0) + "k");
            else if (value > 999) return ((value / 1000).toFixed(1) + "k");
            return String(parseInt(value));
        },
        _getMarkerColor: function getMarkerColor(value, min, max) {
            return this.options.markerColors[
                Math.min(
                    parseInt(Math.log(value - min) / Math.log(max - min) * (this.options.markerColors.length - 1)),
                        this.options.markerColors.length - 1
                )];
        },
        _marker: function(entry, map, min, max) {
            if (min === max) {
                min = parseInt(max / 2);
            }
            var marker = new L.Marker(new L.LatLng(entry.lat, entry.lng), {
                icon: new CanvasIcon({
                    size: this._getMarkerSize(entry.value, min, max),
                    text: this._formatMarkerValue(entry.value),
                    color: this._getMarkerColor(entry.value, min, max)
                }),
                title: String(entry.value)
            });
            marker._field = entry.field;
            marker._fields = entry.fields;
            marker._row = entry.row;
            if (this.options.onMarkerClick) {
                marker.on('click', this.options.onMarkerClick);
            }
            map.addLayer(marker);
            return marker;
        },
        _clearMarkers: function(map) {
            _(this._markers).each(function(m) {
                map.removeLayer(m);
            });
            this._markers = [];
        },
        _createMarkers: function(map) {
            this._clearMarkers(map);
            this._markers = _(this._data).map(_.bind(function(marker) {
                return this._marker(marker, map, this._min, this._max);
            }, this));
        },
        setData: function(plotData) {
            this._data = plotData.data;
            this._min = plotData.min;
            this._max = plotData.max;
            var map = this._map;
            if (map) {
                console.log('Plotting %d markers', this._data.length);
                this._createMarkers(map);
            }
        },
        clear: function() {
            this.setData({ data: [], min: 0, max: 0 });
        },
        onAdd: function(map) {
            this._map = map;
            if (this._data.length) {
                this._createMarkers(map);
            }
        },
        onRemove: function() {
            this.clear();
            this._map = null;
        }
    });

    return MarkersOverlay;

});