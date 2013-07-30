
Form.editors.Range = Form.editors.Base.extend({

	className: 'range',
	
	events: {
		'keyup input': function (event) {
			this.value = this.getValue();
		},
		'change input': function (event) {
			this.value = this.getValue();
		},
		'focus input': function (event) {
			this.trigger('focus', this);
		},
		'blur input':  function (event) {
			this.trigger('blur', this);
		},
		'select input': function (event) {
			this.trigger('select', this);
		}
	},
	
	render: function() {
		var html = '<input type="text"/><span> to </span><input type="text"/>';
		this.$el.html( html );
		
		if ( this.has_rendered ) {
			this.setValue( this.value );
		}
		
		Form.editors.Base.prototype.render.call( this );
		
		return this;
	},
	
	/**
	 * Sets the value of the form element
	 *
	 * @return Number[]
	 */
	getValue: function() {
		var inputs = this.$el.children('input');
		
		return _.map(inputs.toArray(), function(input) {
			// TODO: Client-side validation would use this method
			/*var value = parseFloat(input.value);
			return isNaN(value) ? null : value;*/
			return input.value;
		});
	},
	
	/**
	 * Sets the value of the form element
	 *
	 * @param Number[]
	 */
	setValue: function (value) {
		if ( !value ) return;
		
		var inputs = this.$el.children('input');
		
		inputs[0].value = value[0];
		inputs[1].value = value[1];
		this.value = this.getValue();
	},
	
	focus: function() {
		if ( this.hasFocus) return;
		
		this.$('input:first').focus();
	},
	
	blur: function() {
		if ( !this.hasFocus) return;
		
		this.$('input:first').blur();
	},
	
	select: function() {
		this.$('input:first').select();
	}

});
