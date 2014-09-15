define([
    'underscore', 'jquery',
    'splunkjs/mvc/basesplunkview',
    'leaflet-src',
    'app/maps/appconfig',
    'app/maps/components/overlay/heatmap',
    'app/maps/components/overlay/clusters',
    'splunkjs/mvc/drilldown',
    'css!./map.css'
], function(_, $, BaseSplunkView, L, AppConfig, HeatmapOverlay, ClustersOverlay, Drilldown) {

    AppConfig.load();

    var OVERLAYS = {
        clusters: ClustersOverlay,
        heatmap: HeatmapOverlay
    };

    var MapView = BaseSplunkView.extend({
        className: 'splunk-map',
        options: {
            height: 400,
            autoHeight: false,
            windowHeightOffset: 0,
            autoFitBounds: false,
            center: [32.1012, -7.0313],
            zoom: 3,
            tileLayer: 'Splunk',
            tileLayers: null,
            overlays: [
                'heatmap',
                'clusters'
            ],
            overlaySettings: {},
            drilldown: true
        },
        initialize: function() {
            this.configure();
            this.overlays = [];
            this.listenToOnce(this, 'rendered', function() {
                this.loadOverlays();
                this.listenTo(this.settings, 'change', this.onSettingChange);
                this.bindToComponentSetting('managerid', this.onManagerChange, this);
            });
        },
        loadOverlays: function() {
            var overlayNames = this.settings.get('overlays');
            var overlaySettings = this.settings.get('overlaySettings');
            _(overlayNames)
                .chain()
                .map(function(name) {
                    var Overlay = OVERLAYS[name];
                    return new Overlay(overlaySettings[name] || {});
                })
                .each(_.bind(this.addOverlay, this));

            this.map.addLayer(this.overlays[0]._overlay);

            var notifyOverlays = _.debounce(_.bind(function() {
                _(this.overlays).invoke('boundsChanged', this.map.getBounds());
            }, this), 50);

            this.map.on('viewreset', notifyOverlays);
            this.map.on('move', notifyOverlays);
            this.map.on('moveend', notifyOverlays);
        },
        addOverlay: function(overlay) {
            this.overlays.push(overlay);
            if (this.map) {
                this.initOverlay(overlay);
            }
        },
        initOverlay: function(overlay) {
            this.layersControl.addOverlay(overlay._overlay, overlay.getName());
            this.listenTo(overlay, 'click', this.onOverlayClick);
        },
        onOverlayClick: function(e) {
            if (this.settings.get('drilldown')) {
                var manager = this.manager;
                var DRILLDOWN_PROPERTIES = {
                    _geo_lat_field: '_geo_lat_field',
                    _geo_lon_field: '_geo_long_field',
                    _geo_bounds_south: '_geo_bounds_south',
                    _geo_bounds_west: '_geo_bounds_west',
                    _geo_bounds_north: '_geo_bounds_north',
                    _geo_bounds_east: '_geo_bounds_east'
                };
                if (e.data) {
                    if (!_.all(DRILLDOWN_PROPERTIES, function(srcKey) {
                        return !!e.data[srcKey];
                    })) {
                        console.error('Unable to drill down without context information');
                    } else {
                        var params = _(DRILLDOWN_PROPERTIES).chain().map(function(srcKey, prop) {
                            return [prop, e.data[srcKey]];
                        }).object().value();
                        e.modifierKey = e.ctrlKey;
                        Drilldown.autoDrilldown(e, manager, {
                            drilldownType: 'geoviz',
                            negate: e.altKey,
                            sync: e.modifierKey,
                            params: params
                        });
                    }
                }
            }
        },
        onSettingChange: function(setting, value) {
            if (setting === 'autoHeight') {
                this.handleAutoHeight(value);
            }
        },
        bindToSearchResults: function() {
            this.unbindFromSearchResults();
            this.bindOverlaysToSearchResults();
        },
        bindOverlaysToSearchResults: function() {
            _(this.overlays).invoke('bindToSearchResults', this.manager, this.map);
        },
        unbindFromSearchResults: function() {
            _(this.overlays).invoke('unbindFromSearchResults');
        },
        onManagerChange: function(managers, manager) {
            if (this.manager) {
                this.manager.off(null, null, this);
                this.manager = null;
            }

            this.manager = manager;
            if (!manager) {
                return;
            }

            this.listenTo(manager, 'search:start', this._onSearchStart);
            this.listenTo(manager, 'search:cancelled', this._onSearchCancelled);
            this.listenTo(manager, 'search:error', this._onSearchError);
            this.listenTo(manager, 'search:fail', this._onSearchFailed);
            manager.replayLastSearchEvent(this);

            this.bindToSearchResults();
        },
        _onSearchStart: function() {
            _(this.overlays).invoke('clear');
        },
        _onSearchCancelled: function() {
            console.log('_onSearchCancelled', arguments);
        },
        _onSearchError: function() {
            console.log('_onSearchError', arguments);
        },
        _onSearchFailed: function() {
            console.log('_onSearchFailed', arguments);
        },

        handleAutoHeight: function(autoHeightEnabled) {
            $(window).off('resize.' + this.cid);
            if (autoHeightEnabled) {
                $(window).on('resize.' + this.cid, _.debounce(_.bind(this.updateHeight, this, true)));
                this.updateHeight(true);
            } else {
                this.updateHeight();
            }
        },
        updateHeight: function(auto) {
            this.$el.height(auto === true ?
                    $(window).height() - this.settings.get('windowHeightOffset') :
                    this.settings.get('height')
            );
        },
        configureTileLayers: function(map) {
            var that = this;
            return AppConfig.load().then(function() {
                var enabledTileLayers = that.settings.get('tileLayers');
                var tileLayerList = AppConfig.get('tileLayers');
                if (enabledTileLayers != null) {
                    tileLayerList = _(enabledTileLayers).map(function(name) {
                        return _(tileLayerList).where({ name: name });
                    });
                }

                var tileLayerPromises = _(tileLayerList).map(function(tileLayerConfig) {
                    return tileLayerConfig.type === 'gmaps' ? that.loadGoogleMapsTileLayer(tileLayerConfig) : that.loadTileLayer(tileLayerConfig);
                });

                return $.when.apply($, tileLayerPromises).then(function() {
                    var tileLayers = {};

                    _.each(arguments, function(tl) {
                        tileLayers[tl[1]] = tl[0];
                    });

                    var activeTileLayer = that.settings.get('tileLayer');
                    if (activeTileLayer) {
                        tileLayers[activeTileLayer].addTo(map);
                    } else {
                        arguments[0][0].addTo(map);
                    }
                    return tileLayers;
                });
            });
        },
        loadTileLayer: function(config) {
            return $.Deferred().resolve(L.tileLayer(config.url, _.omit(config, 'url', 'name')), config.name);
        },
        loadGoogleMapsTileLayer: function(config) {
            var result = $.Deferred();
            require(['leaflet-google-tiles'], function(GoogleMapsTileLayer) {
                result.resolve(new GoogleMapsTileLayer({ type: config.mapType }), config.name);
            });
            return result.promise();
        },
        render: function() {
            this.handleAutoHeight(this.settings.get('autoHeight'));

            var mapOptions = _.extend({
                zoomControl: false,
                attributionControl: false
            }, _.omit(this.settings.toJSON(), 'name', 'managerid', 'autoFitBounds', 'autoHeight', 'height', 'id',
                'overlaySettings', 'overlays', 'tileLayer', 'tileLayers', 'windowHeightOffset'));

            var map = this.map = L.map(this.el, mapOptions);

            map.on('resize', function() {
                console.log('MAP RESIZE', arguments);
            });

            this.configureTileLayers(map).then(_.bind(function(tileLayers) {
                this.layersControl = L.control.layers(tileLayers, {}, {});
                this.layersControl.addTo(map);
                L.control.zoom({ position: 'topright' }).addTo(map);
                L.control.attribution({ prefix: '' }).addTo(map);

                this.trigger('rendered', this);
            }, this));

            return this;
        },
        remove: function() {
            _(this.overlays).invoke('remove');
            this.handleAutoHeight(false);
            BaseSplunkView.prototype.remove.apply(this, arguments);
        }
    });

    return MapView;
});