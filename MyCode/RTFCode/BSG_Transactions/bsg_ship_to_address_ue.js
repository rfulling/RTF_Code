/**
 * bsg_ship_to_address_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NAmdConfig ./bsg_transaction_config.json
 */
define(['N/record', 'N/search', 'N/redirect', 'N/runtime', 'accountSettings', 'addressLib', '../BSG_Library_Modules/bsg_module_core.js'],
	function(record, search, redirect, runtime, accountSettings, addressLib, bsgCore){
		function beforeLoad(context){
			var form = context.form;
			var nrec = context.newRecord;
			var curScript = runtime.getCurrentScript();
			var settings = accountSettings.getSettings();

			if(context.type != 'view'){
				// var shipToSelect = form.getField({id:'custrecord_bsg_eqr_ship_to_address'});
				var shipToAddress = form.addField({
					type: 'select',
					id: 'custpage_ship_to_address',
					label: 'Shipping Address'
				});
				shipToAddress.isMandatory = true;
				shipToAddress.addSelectOption({
					value: ' ',
					text: ' '
				});
				form.insertField({
					field: shipToAddress,
					nextfield: 'shipaddress'
				});

				if(!nrec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})){
					nrec.setValue({fieldId:'custbody_bsg_asset_assigned_customer',value:nrec.getValue({fieldId:'entity'})});
				}

				if(nrec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})){
					if(context.type == 'create'){
						//Get Customer Default Shipping Address
						var defaultShippingAddress = addressLib.getDefaultShippingAddress({customerRecordId:nrec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})});

						if(defaultShippingAddress){
							log.debug({title:'DEFAULT SHIPPING ADDRESS!',details:defaultShippingAddress});
							nrec.setValue({fieldId:'custbody_bsg_custom_ship_to_address',value:defaultShippingAddress.value});
							nrec.setValue({fieldId:'shipaddress',value: defaultShippingAddress.text});
						}
					}
					shipToAddress = addressLib.populateAddressBook({
						customerRecordId: nrec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
						scriptType: 'UserEventScript',
						defaultValue: nrec.getValue({fieldId:'custbody_bsg_custom_ship_to_address'}),
						field: shipToAddress
					});
				}

				//Swap Out Primary Contact Field For Custom Field To Limit Selection
				if(context.type == 'edit' || context.type == 'create'){
					var primaryContactField = form.getField({id:'custbody_bsg_primary_contact'});
					var primContactSelect = form.addField({
						id:'custpage_bsg_primary_contact',
						label: 'Primary Contact',
						type: 'select'
					});
					form.insertField({
						field: primContactSelect,
						nextfield: 'custbody_bsg_primary_contact'
					});
					primaryContactField.updateDisplayType({displayType:'hidden'});
					primContactSelect.updateBreakType({
						breakType: 'startcol'
					});
					primContactSelect.isMandatory = true;

					//Get Data To Populate New Primary Contact Field If We Have A Customer
					var curEntity = nrec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'});
					var curPrimary = nrec.getValue({fieldId:'custbody_bsg_primary_contact'}) || 0;

					primContactSelect.addSelectOption({
						value: " ",
						text: " ",
						isSelected: isSelected
					});

					if(curEntity){
						var entityParent = search.lookupFields({
							type: 'customer',
							id: curEntity,
							columns: ['parent']
						});
						var filters = [];
						filters.push(['isinactive','is','F']);
						filters.push('and');

						var tFilter = [];
						tFilter.push(['company','is',curEntity]);
						if(entityParent && entityParent.parent.length){
							tFilter.push('or');
							tFilter.push(['company','is',entityParent.parent[0].value]);
						}
						tFilter.push('or');
						tFilter.push(['customer.parent','is',curEntity]);

						filters.push(tFilter);

						var contactSearch = search.create({
							type: 'contact',
							filters: filters,
							columns: ['entityid']
						});
						var contactRes = contactSearch.run().getRange({start:0,end:100});

						for(var i = 0; i < contactRes.length; i++){
							var isSelected = false;
							if(curPrimary && contactRes[i].id == curPrimary){
								isSelected = true;
							}
							primContactSelect.addSelectOption({
								value: contactRes[i].id,
								text: contactRes[i].getValue({name: 'entityid'}),
								isSelected: isSelected
							});
						}
					}
				}
			}
		}

		return{
			beforeLoad: beforeLoad
		};
	}
);