/**
 * Underscore extensions
 */
_.mixin({

	firstDefined: function() {
		for ( var ii = 0; ii < arguments.length; ii++ ) {
			if ( arguments[ii] !== undefined ) {
				return arguments[ii];
			}
		}
	}
	
});