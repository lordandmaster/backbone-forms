
//==================================================================================================
//FIELD
//==================================================================================================

Form.Field = Backbone.View.extend({

	/**
	 * Constructor
	 * 
	 * @param {Object} options.key
	 * @param {Object} options.form
	 * @param {Object} [options.schema]
	 * @param {Function} [options.schema.template]
	 * @param {Backbone.Model} [options.model]
	 * @param {Object} [options.value]
	 * @param {String} [options.idPrefix]
	 * @param {Function} [options.template]
	 * @param {Function} [options.errorClassName]
	 */
	initialize: function(options) {
		options = options || {};

		//Store important data
		_.extend(this, _.pick(options, 'form', 'key', 'model', 'value', 'idPrefix'));

		//Create the full field schema, merging defaults etc.
		var schema = this.schema = this.createSchema(options.schema);

		//Override defaults
		this.showError = options.showError || schema.showError || this.constructor.showError;
		this.hideError = options.hideError || schema.hideError || this.constructor.hideError;
		this.template = options.template || schema.template || this.constructor.template;
		this.errorClassName = options.errorClassName || this.constructor.errorClassName;
		this.dependants = [];

		//Create editor
		this.editor = this.createEditor();
	},

	/**
	* Creates the full field schema, merging defaults etc.
	*
	* @param {Object|String} schema
	*
	* @return {Object}
	*/
	createSchema: function(schema) {
		if (_.isString(schema)) schema = { type: schema };

		//Set defaults
		schema = _.extend({
			type: 'Text',
			title: this.createTitle()
		}, schema);

		if ( !schema.schemaAttrs ) schema.schemaAttrs = {};

		this.typeName = schema.type;
		//Get the real constructor function i.e. if type is a string such as 'Text'
		schema.type = (_.isString(schema.type)) ? Form.editors[schema.type] : schema.type;

		return schema;
	},

	/**
	* Creates the editor specified in the schema; either an editor string name or
	* a constructor function
	*
	* @return {View}
	*/
	createEditor: function() {
		var options = _.extend(
			_.pick(this, 'schema', 'form', 'key', 'model', 'value'),
			{
				id: this.createEditorId(),
				chosenOptions: this.schema.schemaAttrs.chosenOptions,
				placeholder: this.schema.schemaAttrs.placeholder
			}
		);

		var constructorFn = this.schema.type;

		return new constructorFn(options);
	},

	/**
	 * Creates the ID that will be assigned to the editor
	 *
	 * @return {String}
	 */
	createEditorId: function() {
		var prefix = this.idPrefix,
		id = this.key;

		//Replace periods with underscores (e.g. for when using paths)
		id = id.replace(/\./g, '_');

		//If a specific ID prefix is set, use it
		if (_.isString(prefix) || _.isNumber(prefix)) return prefix + id;
		if (_.isNull(prefix)) return id;

		//Otherwise, if there is a model use it's CID to avoid conflicts when multiple forms are on the page
		if (this.model) return this.model.cid + '_' + id;

		return id;
	},

	/**
	 * Create the default field title (label text) from the key name.
	 * (Converts 'camelCase' to 'Camel Case')
	 *
	 * @return {String}
	 */
	createTitle: function() {
		var str = this.key;

		//Add spaces
		str = str.replace(/([A-Z])/g, ' $1');

		//Uppercase first character
		str = str.replace(/^./, function(str) { return str.toUpperCase(); });

		return str;
	},

	/**
	 * Returns the data to be passed to the template
	 *
	 * @return {Object}
	 */
	templateData: function() {
		var schema = this.schema;

		return {
			help: schema.help || '',
			title: schema.title,
			fieldAttrs: schema.fieldAttrs,
			editorAttrs: schema.editorAttrs,
			schemaAttrs: schema.schemaAttrs,
			key: this.key,
			editorId: this.editor.id,
			editorType: this.typeName
		};
	},

	/**
	 * Render the field and editor
	 *
	 * @return {Field} self
	 */
	render: function() {
		var schema = this.schema,
		editor = this.editor;

		//Render field
		var $field = $($.trim(this.template(_.result(this, 'templateData'))));

		if (schema.fieldClass) $field.addClass(schema.fieldClass);
		if (schema.fieldAttrs) $field.attr(schema.fieldAttrs);

		//Render editor
		$field.find('[data-editor]').add($field).each(function(i, el) {
			var $container = $(el),
			selection = $container.attr('data-editor');

			if (_.isUndefined(selection)) return;

			if ( $container.attr('replace') === undefined ) {
				$container.append(editor.render().el);
			} else {
				$container.replaceWith( editor.render().el );
			}
		});

		_.each(this.dependants, function(fieldset) {
			$field.append( fieldset.render().el );
		});
		
		this.$el.remove();
		this.setElement($field);
		
		// Toggle dependant fields
		var self = this;
		var onchange = function() {
			var value = this.getValue();
			_.each(self.dependants, function (fieldset) {
				if ( value ) {
					fieldset.$el.addClass('active');
					fieldset.$el.parent().addClass('active');
				} else {
					fieldset.$el.removeClass('active');
					fieldset.$el.parent().removeClass('active');
				}
			});
		};
		this.editor.on('change', onchange);
		onchange.call(this.editor);

		return this;
	},
	
	/**
	 * Change a SchemaAttr setting and update the display
	 *
	 * @param Attribute key
	 * @param New value
	 */
	setSchemaAttr: function (attribute, value) {
		this.schema.schemaAttrs[attribute] = value;
		
		// Re-render
		var next = this.$el.next();
		var parent = this.$el.parent();
		this.$el.remove();
		
		if ( next.length < 1 ) {
			parent.append( this.render().$el );
		} else {
			this.render().$el.insertBefore( next );
		}
		
		if ( this.typeName == 'Chosen' ) {
			this.editor.initDisplay(true);
		}
	},

	/**
	 * Check the validity of the field
	 *
	 * @return {String}
	 */
	validate: function() {
		var error = this.editor.validate();

		if (error) {
			this.setError(error.message);
		} else {
			this.clearError();
		}

		return error;
	},

	/**
	* Set the field into an error state, adding the error class and setting the error message
	*
	* @param {String} msg     Error message
	*/
	setError: function(msg) {
		//Nested form editors (e.g. Object) set their errors internally
		if (this.editor.hasNestedForm) return;
		
		if ( msg == undefined ) {
			this.clearError();
		} else {
			this.showError.call(this, msg);
		}
	},

	/**
	* Clear the error state and reset the help message
	*/
	clearError: function() {
		this.hideError.call(this);
	},

	/**
	* Update the model with the new value from the editor
	*
	* @return {Mixed}
	*/
	commit: function() {
		return this.editor.commit();
	},

	/**
	* Get the value from the editor
	*
	* @return {Mixed}
	*/
	getValue: function() {
		return this.editor.getValue();
	},

	/**
	* Set/change the value of the editor
	*
	* @param {Mixed} value
	*/
	setValue: function(value) {
		this.editor.setValue(value);
	},

	/**
	* Give the editor focus
	*/
	focus: function() {
		this.editor.focus();
	},

	/**
	* Remove focus from the editor
	*/
	blur: function() {
		this.editor.blur();
	},

	/**
	* Remove the field and editor views
	*/
	remove: function() {
		this.editor.remove();

		Backbone.View.prototype.remove.call(this);
	}

}, {
  //STATICS

	template: _.template('\
		<div>\
			<label for="<%= editorId %>"><%= title %></label>\
			<div>\
				<span data-editor></span>\
				<div data-error></div>\
				<div><%= help %></div>\
			</div>\
		</div>\
	', null, Form.templateSettings),

	/**
	 * CSS class name added to the field when there is a validation error
	 */
	errorClassName: 'error',

	showError: function (msg) {
		this.$el.addClass( this.errorClassName );
		this.$('[data-error]').html(msg);
	},
	
	hideError: function () {
		this.$el.removeClass( this.errorClassName );
		this.$('[data-error]').empty();
	}

});
