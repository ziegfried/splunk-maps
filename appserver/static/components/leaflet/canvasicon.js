define(['leaflet-src'], function(L) {

    var CanvasIcon = L.Class.extend({
        options: {
            size: 60,
            color: '#f00',
            text: '',
            textColor: 'white',
            className: 'canvas',
            radiationOpacity: [.6, .4, .2, .1]
        },
        initialize: function(options) {
            L.setOptions(this, options);
        },
        createIcon: function() {
            var canvas = document.createElement('canvas');
            var options = this.options;
            var size = options.size;
            canvas.className = 'leaflet-marker-icon';

            var anchor = L.point(size, size).divideBy(2, true);
            canvas.style.marginLeft = (-anchor.x) + 'px';
            canvas.style.marginTop = (-anchor.y) + 'px';
            canvas.width = size;
            canvas.height = size;
            
            this.draw(canvas.getContext('2d'), size);
            return canvas;
        },
        createShadow: function() {
            return null;
        },
        draw: function(context, size) {
            var options = this.options;
            var color = options.color;
            var center = size / 2;

            var radiationStart = size * .26;
            var radiationSpacing = size * .02;
            var radiationWidth = 2 * radiationSpacing;
            var radiationOpacity = options.radiationOpacity;

            function drawRadiation(startAngle, endAngle) {
                for (var i = 0; i < 4; i++) {
                    var innerRadius = radiationStart + radiationSpacing * i + radiationWidth * i;
                    context.beginPath();
                    context.arc(center, center, innerRadius,
                            startAngle * Math.PI / 180 - Math.PI / 2,
                            endAngle * Math.PI / 180 - Math.PI / 2, false);
                    context.lineWidth = radiationWidth;
                    context.strokeStyle = color;
                    context.globalAlpha = radiationOpacity[i];
                    context.stroke();
                }
            }

            drawRadiation(-50, 50);
            drawRadiation(70, 170);
            drawRadiation(190, 290);

            context.beginPath();
            context.arc(center, center, size * .21, 0, 2 * Math.PI, false);
            context.globalAlpha = .9;
            context.fillStyle = color;
            context.lineWidth = 0;
            context.fill();

            if (options.text) {
                var len = String(options.text).length;
                context.globalAlpha = 1;
                context.font = String(size / (len > 3 ? 8 : 6)) + 'px sans-serif';
                context.textAlign = 'center';
                context.fillStyle = options.textColor;
                context.fillText(options.text, center, size * (len > 3 ? .54 : .557));
            }
        }
    });

    return CanvasIcon;
});