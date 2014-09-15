define([
    'underscore',
    'leaflet-src',
    'splunkjs/mvc/basemanager',
    'splunkjs/mvc/settings'
], function(_, L, BaseManager, Settings) {

    var LeafletSplunkOverlay = BaseManager.extend({
        options: {
            maxClusters: 100
        },
        output_mode: 'json_rows',
        result_count: 10000,
        include_bounds: false,
        initialize: function(options) {
            this.settings = new Settings(_.extend({}, this.options, options || {}));
            this._overlay = this.instrumentOverlay(this.createLeafletOverlay());
        },
        createLeafletOverlay: function() {
            // abstract
        },
        instrumentOverlay: function(overlay) {
            var overlayOnAdd = overlay.onAdd;
            var overlayOnRemove = overlay.onRemove;
            var that = this;
            overlay.onAdd = function() {
                overlayOnAdd.apply(overlay, arguments);
                that.onOverlayStateChange(true);
            };
            overlay.onRemove = function() {
                overlayOnRemove.apply(overlay, arguments);
                that.onOverlayStateChange(false);
            };
            return overlay;
        },
        getMap: function() {
            return this._overlay._map;
        },
        getMapBounds: function() {
            var map = this.getMap();
            if (map) {
                return map.getBounds();
            }
        },
        isOverlayActive: function() {
            return this.getMap() != null;
        },
        onOverlayStateChange: function(active) {
            if (this.resultsModel) {
                console.log(this.getName(), (active ? 'enabling' : 'disabling') + 'results autofetch');
                this.resultsModel.set('autofetch', active);
            }
        },
        boundsChanged: function(bounds) {
            console.log('boundsChanged');
            this.resultsModel.set('search', this.getPostProcessSearch(bounds));
        },
        bindToSearchResults: function(manager, map) {
            this.unbindFromSearchResults();
            this.clear();
                                      
            console.log(this.getName(), 'bound to search results');
            var resultsModel = this.resultsModel = manager.data(this.settings.get("data") || "preview", {
                output_mode: this.output_mode,
                count: this.settings.get('maxClusters'),
                offset: 0,
                show_metadata: false,
                autofetch: false,
                search: this.getPostProcessSearch(map.getBounds())
            });

            resultsModel.on("data", this.onDataChanged, this);
            resultsModel.on("error", this.clear, this);

            if (this.isOverlayActive()) {
                console.log(this.getName(), 'Enabling results autofetch (bind)');
                resultsModel.set('autofetch', true);
            }
        },
        unbindFromSearchResults: function() {
            console.log(this.getName(), 'unbindFromSearchResults');
            if (this.resultsModel) {
                this.resultsModel.destroy();
                this.resultsModel = null;
            }
        },
        getPostProcessSearch: function(bounds) {
            return this.geoFilterSearch(bounds, this.settings.get('maxClusters'));
        },
        geoFilterSearch: function(bounds, maxClusters) {
            var search = ['geofilter'];
            var sw = bounds.getSouthWest();
            var ne = bounds.getNorthEast();
            search.push('south=' + JSON.stringify(sw.lat));
            search.push('west=' + JSON.stringify(sw.lng));
            search.push('north=' + JSON.stringify(ne.lat));
            search.push('east=' + JSON.stringify(ne.lng));
            search.push('maxclusters=' + maxClusters);
            if (!this.include_bounds) {
                search.push(' | fields - _*');
            }
            var pp = search.join(' ');
            console.log(this.getName(), 'Computed postprocess', pp);
            return pp;

        },
        onDataChanged: function(unused, data) {
            var latFieldIdx = _(data.fields).indexOf('latitude');
            var lonFieldIdx = _(data.fields).indexOf('longitude');
            var valueField = _(data.fields).find(function(field) {
                return field != 'latitude' && field != 'longitude';
            });
            var valueFieldIdx = _(data.fields).indexOf(valueField);
            var min = +Infinity;
            var max = 0;
            var total = 0;
            var points = _(data.rows).map(function(row) {
                var val = parseFloat(row[valueFieldIdx]);
                val = isNaN(val) || !isFinite(val) ? 1 : val;
                total += val;
                min = Math.min(val, min);
                max = Math.max(val, max);
                return {
                    lat: parseFloat(row[latFieldIdx]),
                    lng: parseFloat(row[lonFieldIdx]),
                    value: val,
                    field: valueField,
                    fields: data.fields,
                    row: row
                };
            });

            this._plotData = { data: points, min: min, max: max, total: total };
            this.plotData(this._plotData);
        },
        clear: function() {
            this._plotData = null;
            this._overlay.clear();
        },
        plotData: function(plotData) {
            this._overlay.setData(plotData);
        },
        remove: function() {
            if (this._overlay) {
                this._overlay.onRemove();
                this._overlay = null;
            }
        }
    });

    return LeafletSplunkOverlay;
});