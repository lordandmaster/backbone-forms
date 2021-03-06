
//==================================================================================================
//FORM
//==================================================================================================

var Form = Backbone.View.extend({

	/**
	 * Constructor
	 * 
	 * @param {Object} [options.schema]
	 * @param {Backbone.Model} [options.model]
	 * @param {Object} [options.data]
	 * @param {String[]|Object[]} [options.fieldsets]
	 * @param {String[]} [options.fields]
	 * @param {String} [options.idPrefix]
	 * @param {Form.Field} [options.Field]
	 * @param {Form.Fieldset} [options.Fieldset]
	 * @param {Function} [options.template]
	 */
	initialize: function(options) {
		var self = this;

		options = options || {};
		
		this._chosen_editors = [];
		this._submitHandler = null;
		this.dependencyClass = options.dependencyClass || '';

		//Find the schema to use
		var schema = this.schema = (function() {
			//Prefer schema from options
			if (options.schema) return _.result(options, 'schema');

			//Then schema on model
			var model = options.model;
			if (model && model.schema) {
				return (_.isFunction(model.schema)) ? model.schema() : model.schema;
			}

			//Then built-in schema
			if (self.schema) {
				return (_.isFunction(self.schema)) ? self.schema() : self.schema;
			}

			//Fallback to empty schema
			return {};
		})();

		//Store important data
		_.extend(this, _.pick(options, 'model', 'data', 'idPrefix',
			'showError', 'hideError', 'formContainer'));

		//Override defaults
		var constructor = this.constructor;
		this.template = options.template || constructor.template;
		this.Fieldset = options.Fieldset || constructor.Fieldset;
		this.Field = options.Field || constructor.Field;
		this.NestedField = options.NestedField || constructor.NestedField;

		//Check which fields will be included (defaults to all)
		var selectedFields = this.selectedFields = options.fields || _.keys(schema);

		//Create fields
		var fields = this.fields = {};

		_.each(selectedFields, function(key) {
			var fieldSchema = schema[key];
			fields[key] = this.createField(key, fieldSchema);
		}, this);

		//Create fieldsets
		var fieldsetSchema = options.fieldsets || [selectedFields],
		fieldsets = this.fieldsets = [];

		_.each(fieldsetSchema, function(itemSchema) {
			this.fieldsets.push(this.createFieldset(itemSchema));
		}, this);
		
		this.setSubmitHandler( options.onSubmit );
	},

	/**
	* Creates a Fieldset instance
	*
	* @param {String[]|Object[]} schema       Fieldset schema
	*
	* @return {Form.Fieldset}
	*/
	createFieldset: function(schema) {
		var options = {
			dependencyClass: this.dependencyClass,
			schema: schema,
			fields: this.fields
		};

		return new this.Fieldset(options, this);
	},

	/**
	 * Creates a Field instance
	 *
	 * @param {String} key
	 * @param {Object} schema       Field schema
	 *
	 * @return {Form.Field}
	 */
	createField: function(key, schema) {
		var options = {
			form: this,
			key: key,
			schema: schema,
			idPrefix: this.idPrefix,
			hideError: this.hideError,
			showError: this.showError
		};

		if (this.model) {
			options.model = this.model;
		} else if (this.data) {
			options.value = this.data[key];
		} else {
			options.value = null;
		}

		var field = new this.Field(options);

		this.listenTo(field.editor, 'all', this.handleEditorEvent);

		if ( schema && schema.type == 'Chosen' ) {
			this._chosen_editors[ this._chosen_editors.length ] = field.editor;
		}

		return field;
	},

	/**
	 * Callback for when an editor event is fired.
	 * Re-triggers events on the form as key:event and triggers additional form-level events
	 *
	 * @param {String} event
	 * @param {Editor} editor
	 */
	handleEditorEvent: function(event, editor) {
		//Re-trigger editor events on the form
		var formEvent = editor.key+':'+event;

		this.trigger.call(this, formEvent, this, editor);

		//Trigger additional events
		switch (event) {
			case 'change':
				this.trigger('change', this);
				break;

			case 'focus':
				if (!this.hasFocus) this.trigger('focus', this);
				break;

			case 'blur':
				if (this.hasFocus) {
					//TODO: Is the timeout etc needed?
					var self = this;
					_.defer(function() {
						var focusedField = _.find(self.fields, function(field) {
							return field.editor.hasFocus;
						});

						if (!focusedField) self.trigger('blur', self);
					});
				}
				break;
		}
	},

	render: function() {
		var self = this,
		fields = this.fields;

		//Render form
		var $form;
		if ( this.formContainer ) {
			$form = $(this.formContainer).empty().hide();
			$form.attr('data-fieldsets', 1);
		} else {
			$form = $($.trim(this.template(_.result(this, 'templateData'))));
		}

		//Render standalone editors
		$form.find('[data-editors]').add($form).each(function(i, el) {
			var $container = $(el),
			selection = $container.attr('data-editors');

			if (_.isUndefined(selection)) return;

			//Work out which fields to include
			var keys = (selection == '*')
				? self.selectedFields || _.keys(fields)
				: selection.split(',');

			//Add them
			_.each(keys, function(key) {
				var field = fields[key];

				$container.append(field.editor.render().el);
			});
		});

		//Render standalone fields
		$form.find('[data-fields]').add($form).each(function(i, el) {
			var $container = $(el),
			selection = $container.attr('data-fields');

			if (_.isUndefined(selection)) return;

			//Work out which fields to include
			var keys = (selection == '*')
				? self.selectedFields || _.keys(fields)
				: selection.split(',');

			//Add them
			_.each(keys, function(key) {
				var field = fields[key];

				$container.append(field.render().el);
			});
		});

		//Render fieldsets
		$form.find('[data-fieldsets]').add($form).each(function(i, el) {
			var $container = $(el),
			selection = $container.attr('data-fieldsets');

			if (_.isUndefined(selection)) return;

			_.each(self.fieldsets, function(fieldset) {
				$container.append(fieldset.render().el);
			});
		});
		
		$form.css('display', '');
		
		if ( this.formContainer ) {
			$form = $form.closest('form');
		}

		// Setup the form.submit handler
		var submit = this._submitHandler;
		if ( typeof submit == 'function' ) {
			$form.submit(function(e) {
				return submit.call(self, e);
			});
		}

		//Set the main element
		this.setElement($form);

		return this;
	},

  /**
   * Validate the data
   *
   * @return {Object}       Validation errors
   */
  validate: function() {
    var self = this,
        fields = this.fields,
        model = this.model,
        errors = {};

    //Collect errors from schema validation
    _.each(fields, function(field) {
      var error = field.validate();
      if (error) {
        errors[field.key] = error;
      }
    });

    //Get errors from default Backbone model validator
    if (model && model.validate) {
      var modelErrors = model.validate(this.getValue());

      if (modelErrors) {
        var isDictionary = _.isObject(modelErrors) && !_.isArray(modelErrors);

        //If errors are not in object form then just store on the error object
        if (!isDictionary) {
          errors._others = errors._others || [];
          errors._others.push(modelErrors);
        }

        //Merge programmatic errors (requires model.validate() to return an object e.g. { fieldKey: 'error' })
        if (isDictionary) {
          _.each(modelErrors, function(val, key) {
            //Set error on field if there isn't one already
            if (fields[key] && !errors[key]) {
              fields[key].setError(val);
              errors[key] = val;
            }

            else {
              //Otherwise add to '_others' key
              errors._others = errors._others || [];
              var tmpErr = {};
              tmpErr[key] = val;
              errors._others.push(tmpErr);
            }
          });
        }
      }
    }

    return _.isEmpty(errors) ? null : errors;
  },

  /**
   * Update the model with all latest values.
   *
   * @param {Object} [options]  Options to pass to Model#set (e.g. { silent: true })
   *
   * @return {Object}  Validation errors
   */
  commit: function(options) {
    //Validate
    var errors = this.validate();
    if (errors) return errors;

    //Commit
    var modelError;

    var setOptions = _.extend({
      error: function(model, e) {
        modelError = e;
      }
    }, options);

    this.model.set(this.getValue(), setOptions);
    
    if (modelError) return modelError;
  },

  /**
   * Get all the field values as an object.
   * Use this method when passing data instead of objects
   *
   * @param {String} [key]    Specific field value to get
   */
  getValue: function(key) {
    //Return only given key if specified
    if (key) return this.fields[key].getValue();

    //Otherwise return entire form
    var values = {};
    _.each(this.fields, function(field) {
      values[field.key] = field.getValue();
    });

    return values;
  },

  /**
   * Update field values, referenced by key
   *
   * @param {Object|String} key     New values to set, or property to set
   * @param val                     Value to set
   */
  setValue: function(prop, val) {
    var data = {};
    if (typeof prop === 'string') {
      data[prop] = val;
    } else {
      data = prop;
    }

    var key;
    for (key in this.schema) {
      if (data[key] !== undefined) {
        this.fields[key].setValue(data[key]);
      }
    }
  },

  /**
   * Returns the editor for a given field key
   *
   * @param {String} key
   *
   * @return {Editor}
   */
  getEditor: function(key) {
    var field = this.fields[key];
    if (!field) throw 'Field not found: '+key;

    return field.editor;
  },

  /**
   * Gives the first editor in the form focus
   */
  focus: function() {
    if (this.hasFocus) return;

    //Get the first field
    var fieldset = this.fieldsets[0],
        field = fieldset.getFieldAt(0);

    if (!field) return;

    //Set focus
    field.editor.focus();
  },

  /**
   * Removes focus from the currently focused editor
   */
  blur: function() {
    if (!this.hasFocus) return;

    var focusedField = _.find(this.fields, function(field) {
      return field.editor.hasFocus;
    });

    if (focusedField) focusedField.editor.blur();
  },

  /**
   * Manages the hasFocus property
   *
   * @param {String} event
   */
  trigger: function(event) {
    if (event === 'focus') {
      this.hasFocus = true;
    }
    else if (event === 'blur') {
      this.hasFocus = false;
    }

    return Backbone.View.prototype.trigger.apply(this, arguments);
  },

  /**
   * Override default remove function in order to remove embedded views
   *
   * TODO: If editors are included directly with data-editors="x", they need to be removed
   * May be best to use XView to manage adding/removing views
   */
  remove: function() {
    _.each(this.fieldsets, function(fieldset) {
      fieldset.remove();
    });

    _.each(this.fields, function(field) {
      field.remove();
    });

    Backbone.View.prototype.remove.call(this);
  },
  
	/**
	 * Execute $.chosen on all the editors. This should only be called after the
	 * selects have been attached to the DOM. Because chosen is weird like that?
	 */
	initChosens: function() {
		for ( var ii = 0; ii < this._chosen_editors.length; ii++ ) {
			this._chosen_editors[ii].initDisplay();
		}
		return this;
	},
  
	/**
	 * Apply element to DOM - this method should be used instead of manually
	 * appending the html because initChosens needs to be executed.
	 */
	renderTo: function (parent, method) {
		method = method || 'html';
		$(parent)[method]( this.render().el );
		this.initChosens();
		return this;
	},
	
	/**
	 * Add a handler for when the form submits. Access value hash with
	 * this.getValue() in the handler
	 */
	setSubmitHandler: function (submit) {
		if ( submit == undefined ) {
			return;
		}
		
		this._submitHandler = submit;
		return this;
	}

}, {

	//STATICS
	template: _.template('\
		<form data-fieldsets></form>\
	', null, this.templateSettings),

	templateSettings: {
		evaluate: /<%([\s\S]+?)%>/g, 
		interpolate: /<%=([\s\S]+?)%>/g, 
		escape: /<%-([\s\S]+?)%>/g
	},

	editors: {}

});
