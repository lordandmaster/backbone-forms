/**
 * Chosen editor
 *
 * Renders a Chosen.js selector with given options
 *
 * Requires an 'options' value on the schema.
 */
Form.editors.Chosen = Form.editors.Select.extend({

	chosenOptions: null,
	
	initialize: function (options) {
		Form.editors.Select.prototype.initialize.call(this, options);
		
		if ( !this.$el.chosen ) {
			throw new Error('Chosen plugin not detected!');
		}
		
		this.chosenOptions = options.chosenOptions;
	},
	
	focus: function() {
		if (this.hasFocus) return;
		
		// Chosen hides the initial select element to which $el points, and
		// hidden elements do not support focus/blur behavior. Thus, we need
		// to only execute the handlers. Chosen does not implement blur/focus
		// handles?
		this.$el.triggerHandler('focus');
	},
	
	blur: function() {
		if (!this.hasFocus) return;
		
		// See comment in focus()
		this.$el.triggerHandler('blur');
	},
	
	render: function() {
		Form.editors.Select.prototype.render.call(this);
		
		// TODO: Should not use schemaAttrs for this check
		var attrs = this.schema.schemaAttrs;
		if ( attrs && attrs.datatype == 'multi_select' ) {
			this.el.multiple = 'multiple';
		}
		
		if ( this.$el.parent().length > 0 ) {
			this.$el.removeClass('chzn-done');
			this.initDisplay();
		}
		
		return this;
	},
	
	initDisplay: function() {
		this.$el.closest('.dependent').css('display', 'block');
		this.$el.chosen( this.chosenOptions );
		this.$el.closest('.dependent').css('display', '');
	},
	
	remove: function() {
		// Kill the chosen stuff
		this.$el.next().remove();
		Form.editors.Select.prototype.remove.call(this);
	}
	
});