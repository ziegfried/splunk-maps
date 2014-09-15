require.config({
    paths: {
        'app': '../app',
        'async': '../app/maps/contrib/requirejs-plugins/async',
        'leaflet-src': '../app/maps/contrib/leaflet-0.7.3/leaflet-src',
        'heatmap': '../app/maps/contrib/heatmap.js/heatmap',
        'heatmap-leaflet': '../app/maps/contrib/heatmap.js/leaflet-heatmap',
        'leaflet-google-tiles': '../app/maps/contrib/leaflet-plugins/Google'
    },
    shim: {
        'heatmap': {
            exports: 'h337'
        },
        'heatmap-leaflet': {
            deps: ['heatmap', 'leaflet-src'],
            exports: 'HeatmapOverlay'
        },
        'leaflet-src': {
            deps: ['css!../app/maps/contrib/leaflet-0.7.3/leaflet.css'],
            exports: 'L'
        },
        'leaflet-google-tiles': {
            deps: ['leaflet', 'async!//maps.google.com/maps/api/js?v=3&sensor=false'],
            exports: 'L.Google'
        }
    }
});