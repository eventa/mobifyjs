define(["utils"], function(Utils) {

var ResizeImages = {};

var absolutify = document.createElement('a');

// A regex for detecting http(s) URLs.
var httpRe = /^https?/;

// A protocol relative URL for the host ir0.mobify.com
var PROTOCOL_AND_HOST = '//ir0.mobify.com';

function persistWebpSupport(supported) {
    document.cookie = "webpSupport=" + supported + "; path=/"
}

// Synchronous WEBP detection using regex
// Avoiding async way of detecting due to performance reasons
// (onload of detector image won't fire until document is complete)
function webpDetector(userAgent){
    var userAgent = userAgent || navigator.userAgent;

    // Check if WEBP support has already been detected
    var match = /webpSupport=([^&;]*)/.exec(document.cookie);
    if (match && match[1] == "0") {
        return 0;
    } else if (match && match[1] == "1") {
        return 1;
    }

    function regexDetect(userAgent){
        // Credit to Ilya Grigorik for WEBP regex matching
        // https://github.com/igrigorik/webp-detect/blob/master/pagespeed.cc
        var supportedRe = /(Android\s|Chrome\/|Opera9.8*Version\/..\.|Opera..\.)/i;
        var unsupportedVersionsRe = new RegExp('(Android\\s(0|1|2|3)\\.)|(Chrome\\/[0-8]\\.)' +
                                    '|(Chrome\\/9\\.0\\.)|(Chrome\\/1[4-6]\\.)|(Android\\sChrome\\/1.\\.)' +
                                    '|(Android\\sChrome\\/20\\.)|(Opera\\/9\\.80*Version\\/10\\.)' + 
                                    '|(Opera\\/9\\.80*Version\\/11\\.0)|(Opera.10\\.)|(Opera.11\\.)' +
                                    '|(Chrome\\/(1.|20|21|22)\\.)', 'i');

        // Return false if browser is not supported
        if (!supportedRe.test(userAgent)) {
            return 0;
        }

        // Return false if browser is supported, but the version
        // is known to not support WEBP.
        if (unsupportedVersionsRe.test(userAgent)) {
            return 0;  
        }
        return 1;
    }

    function dataUriDetect() {
        // Credit to Modernizer for data uri detection method
        // https://github.com/Modernizr/Modernizr/blob/fb76d75fbf97f715e666b55b8aa04e43ef809f5e/feature-detects/img-webp.js
        var image = new Image();
        image.onload = function() {
            persistWebpSupport((image.width == 4) ? 1 : 0);
        };
        image.src = 'data:image/webp;base64,UklGRjgAAABXRUJQVlA4ICwAAAAQAgCdASoEAAQAAAcIhYWIhYSIgIIADA1gAAUAAAEAAAEAAP7%2F2fIAAAAA';
    }

    // Run async WEBP detection for future proofing
    // This test may not finish running before the first call of `resize`
    dataUriDetect();

    // Run regex based synchronous WEBP detection
    var support = regexDetect(userAgent);
    persistWebpSupport(support);

    return support;

}

function getPhysicalScreenSize(devicePixelRatio) {

    function multiplyByPixelRatio(sizes) {
        var dpr = devicePixelRatio || 1;

        sizes.width = Math.round(sizes.width * dpr);
        sizes.height = Math.round(sizes.height * dpr);

        return sizes;
    }

    var iOS = navigator.userAgent.match(/iphone|ipod|ipad/i);
    var androidVersion = (navigator.userAgent.match(/android (\d)/i) || {})[1];

    var sizes = {
        width: window.outerWidth
      , height: window.outerHeight
    };

    // Old Android and BB10 use physical pixels in outerWidth/Height, which is what we need
    // New Android (4.0 and above) use CSS pixels, requiring devicePixelRatio multiplication
    // iOS lies about outerWidth/Height when zooming, but does expose CSS pixels in screen.width/height

    if (!iOS) {
        if (androidVersion > 3) return multiplyByPixelRatio(sizes);
        return sizes;
    }

    var isLandscape = window.orientation % 180;

    if (isLandscape) {
        sizes.height = screen.width;
        sizes.width = screen.height;
    } else {
        sizes.width = screen.width;
        sizes.height = screen.height;
    }

    return multiplyByPixelRatio(sizes);
}

/**
 * Returns a URL suitable for use with the 'ir' service.
 */
var getImageURL = ResizeImages.getImageURL = function(url, options) {
    var opts = Utils.clone(defaults);
    if (options) {
        Utils.extend(opts, options);
    }

    var bits = [PROTOCOL_AND_HOST];

    if (opts.projectName) {
        var projectId = "project-" + opts.projectName;
        bits.push(projectId);
    }

    if (options.cacheHours) {
        bits.push('c' + options.cacheHours);
    }

    if (opts.format) {
        bits.push(options.format + (options.quality || ''));
    }

    if (opts.maxWidth) {
        bits.push(options.maxWidth)

        if (opts.maxHeight) {
            bits.push(options.maxHeight);
        }
    }

    bits.push(url);
    return bits.join('/');
};

/**
 * Searches the collection for image elements and modifies them to use
 * the Image Resize service. Pass `options` to modify how the images are 
 * resized.
 */
ResizeImages.resize = function(imgs, options) {
    var opts = Utils.clone(defaults);
    if (options) {
        Utils.extend(opts, options);
    }

    var dpr = opts.devicePixelRatio || window.devicePixelRatio;

    var screenSize = getPhysicalScreenSize(dpr);

    // If maxHeight/maxWidth are not specified, use screen dimentions
    // in device pixels
    var width = opts.maxWidth || screenSize.width;
    var height = opts.maxHeight || screenSize.height;

    // Otherwise, compute device pixels
    if (dpr && opts.maxWidth) {
        width = width * dpr;
        if (opts.maxHeight) {
            height = height * dpr;
        }
    }

    // Doing rounding for non-integer device pixel ratios
    opts.maxWidth = Math.ceil(width);
    opts.maxHeight = Math.ceil(height);

    if (!opts.format && opts.webp) {
        opts.format = "webp";
    }

    var attrVal;
    for(var i=0; i<imgs.length; i++) {
        var img = imgs[i];
        if (attrVal = img.getAttribute(opts.attribute)) {
            absolutify.href = attrVal;
            var url = absolutify.href;
            if (httpRe.test(url)) {
                img.setAttribute(opts.attribute, getImageURL(url, opts));
            }
        }
    }
    return imgs;
};

var defaults = {
      projectName: "oss-" + location.hostname.replace(/[^\w]/g, '-'),
      attribute: "x-src",
      webp: webpDetector()
};

return ResizeImages;

});
