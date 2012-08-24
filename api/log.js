(function(Mobify, $) {

    if (!console.group) {
        console.group = console.log;
        console.groupEnd = function(){};
    }

    $.extend(console, {
        logCollapsedGroup : function(fn, title, obj) {
            return this.logGroup(fn, title, obj, !!console.groupCollapsed);
        }
      , logGroup : function(fn, title, obj, _collapse) {
            var justStarted = true;
            $.each(obj, function(key, value) {
                if (justStarted) {
                    _collapse ? console.groupCollapsed(title) : console.group(title);
                }

                if (typeof key == "number") {
                    console[fn](value);
                } else {
                    console[fn](key, value);
                }
                
                justStarted = false;
            });

            if (!justStarted) console.groupEnd();
        }
    });

    Mobify.die = function() {
        var args = [].slice.call(arguments);
        console.group('(T_T) Fatal error (T_T)');
        console.error.apply(console, args);
        console.groupEnd();

        throw args;
    }

    var oldAdaptHTML = Mobify.transform.adaptHTML;

    Mobify.transform.adaptHTML = function(adaptFn) {
        oldAdaptHTML.call(this, function(source, callback) {
            adaptFn.call(this, source, function(result) {
                callback(result);
                console.logTiming();
                console.logMObjects();                
            });
        });

        
    };

})(Mobify, Mobify.$);