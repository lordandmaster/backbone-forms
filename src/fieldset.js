
//==================================================================================================
//FIELDSET
//==================================================================================================

Form.Fieldset = Backbone.View.extend({

	/**
	 * Constructor
	 *
	 * Valid fieldset schemas:
	 *   ['field1', 'field2']
	 *   { legend: 'Some Fieldset', fields: ['field1', 'field2'] }
	 *
	 * @param {String[]|Object[]} options.schema      Fieldset schema
	 * @param {Object} options.fields           Form fields
	 */
	initialize: function(options) {
		var self = this;
		
		options = options || {};

		//Create the full fieldset schema, merging defaults etc.
		var schema = this.schema = this.createSchema(options.schema);

		//Store the fields for this fieldset
		this.fields = _.pick(options.fields, schema.fields);
		
		this.dependencyClass = options.dependencyClass;
		this.cssClass = options.cssClass || '';

		this.content = [];
		var content = options.schema.content;
		
		// Store nested fieldsets
		if ( content ) {
			_.each(content, function (item) {
				if ( item.type == 'fields' ) {
					self._registerFields( item.fields, options.fields );
				}
				else if ( item.type == 'fieldset' ) {
					self.content[ self.content.length ] = new Form.Fieldset({
						dependencyClass: self.dependencyClass,
						schema: item,
						fields: options.fields
					});
				}
			});
		}

		//Override defaults
		this.template = options.template || schema.template || this.constructor.template;
	},
	
	_registerFields: function (fields, fields_ref) {
		_.each(fields, function (field) {
			if ( field instanceof Array ) {
				this._registerDependants( field, fields_ref );
			} else {
				this.content[ this.content.length ] = fields_ref[ field ];
			}
		}, this);
	},
	
	_registerDependants: function (fieldsets, fields_ref) {
		var dependants = this.content[ this.content.length - 1 ].dependants;
		
		_.each(fieldsets, function (fieldset) {
			dependants[ dependants.length ] = new Form.Fieldset({
				dependencyClass: this.dependencyClass,
				cssClass: this.dependencyClass,
				schema: fieldset,
				fields: fields_ref
			});
		}, this);
	},

	/**
	* Creates the full fieldset schema, normalising, merging defaults etc.
	*
	* @param {String[]|Object[]} schema
	*
	* @return {Object}
	*/
	createSchema: function(schema) {
		//Normalise to object
		if (_.isArray(schema)) {
			schema = { fields: schema };
		}

		//Add null legend to prevent template error
		schema.legend = schema.legend || null;

		return schema;
	},

	/**
	 * Returns the field for a given index
	 *
	 * @param {Number} index
	 *
	 * @return {Field}
	 */
	getFieldAt: function(index) {
		var key = this.schema.fields[index];

		return this.fields[key];
	},

	/**
	* Returns data to pass to template
	*
	* @return {Object}
	*/
	templateData: function() {
		return this.schema;
	},

	/**
	 * Renders the fieldset and fields
	 *
	 * @return {Fieldset} this
	 */
	render: function() {
		var schema  = this.schema;
		var fields  = this.fields;
		var content = this.content;

		//Render fieldset
		var $fieldset = $($.trim(this.template(_.result(this, 'templateData'))));
		
		$fieldset.addClass( this.cssClass );

		//Render fields
		$fieldset.find('[data-fields]').add($fieldset).each(function(i, el) {
			var $container = $(el),
			selection = $container.attr('data-fields');

			if (_.isUndefined(selection)) return;

			_.each(fields, function(field) {
				$container.append(field.render().el);
			});
			
			var group_broken = false;
			var last = $container;
			
			// Render nested fieldsets and fields
			_.each(content, function(item) {
				var $el = item.render().$el;
				
				if ( item.fields ) {
					$el.insertAfter( last );
					last = $el;
					group_broken = true;
				} else {
					if ( group_broken ) {
						var newbox = $($container[0].cloneNode());
						newbox.insertAfter(last);
						last = $container = newbox;
						group_broken = false;
					}
					$container.append( $el );
				}
			});
		});

		this.setElement($fieldset);

		return this;
	},

	/**
	 * Remove embedded views then self
	 */
	remove: function() {
		_.each(this.fields, function(field) {
			field.remove();
		});

		Backbone.View.prototype.remove.call(this);
	}
  
}, {
  //STATICS

	template: _.template('\
		<fieldset>\
			<% if (legend) { %>\
				<legend><%= legend %></legend>\
			<% } %>\
			<ol data-fields></ol> \
		</fieldset>\
	', null, Form.templateSettings)

});
