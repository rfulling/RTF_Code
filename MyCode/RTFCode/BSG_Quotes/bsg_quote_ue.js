/**
 * bsg_quote_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NAmdConfig ./bsg_quote_config.json
 */
define(['N/record', 'N/search', '../BSG_Library_Modules/bsg_module_core.js'],
	function(record, search, bsgCore){
		function beforeLoad(context){
			var form = context.form;
			var nrec = context.newRecord;

			//Set Asset Value If Parameter In URL
			if(context.type == 'create'){
				try{
					if(context.request && context.request.parameters){
						if(context.request.parameters.assetcard){
							nrec.setValue({fieldId:'custbody_bsg_asset_card', value: context.request.parameters.assetcard});
							nrec.setValue({fieldId:'custbody_bsg_asset_assigned_customer',value:nrec.getValue({fieldId:'entity'})});
							nrec.setValue({fieldId:'custpage_asset_location_address',value:nrec.getValue({fieldId:'shipaddresslist'})});
						}
					}
				}catch(e){
					//Sometimes throws an error when printing for some reason.
				}
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
				//primContactSelect.isMandatory = true;

				//Get Data To Populate New Primary Contact Field If We Have A Customer
				var curEntity = nrec.getValue({fieldId:'entity'});
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
            
			if(contactRes){
            	   primContactSelect.isMandatory = true;
               }
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
		function afterSubmit(context){
			if(context.type == 'delete'){
				return false;
			}
			var nrec = context.newRecord;

			var assetValues = {}, curAsset, requiredStatus, i, z, itemLookup, assetCardRes, invDetail;
			var assetCardLineJSON = [];
			var invDetailLineJSON = [];
			var assetColumns = ['custrecord_bsg_asset_status','custrecord_bsg_asset_type','custrecord_bsg_asset_side_shift','custrecord_bsg_asset_serial',
				'custrecord_bsg_asset_lbr','custrecord_bsg_asset_4th_valve','custrecord_bsg_asset_mast_height','custrecord_bsg_asset_lift_height',
				'custrecord_bsg_asset_capacity','custrecord_bsg_asset_fork_size','custrecord_bsg_asset_drive_tire_type','custrecord_bsg_asset_steer_tire_type',
				'custrecord_bsg_asset_non_marking','custrecord_bsg_asset_voltage','custrecord_bsg_asset_connector_type','custrecord_bsg_asset_item_make',
				'custrecord_bsg_asset_equipment_subclass','name','custrecord_bsg_asset_built_in_charger','custrecord_bsg_asset_watering_system','custrecord_bsg_asset_hour_meter_reading',
				'custrecord_bsg_asset_rental_rate_data'
			];
			var soRec = false;
			var nrecItemLineCount = nrec.getLineCount({sublistId:'item'});
			for(i = 0; i < nrecItemLineCount; i++){
				itemLookup = search.lookupFields({
					type:'item',
					id:nrec.getSublistValue({sublistId:'item',fieldId:'item',line:i}),
					columns:['custitem_bsg_item_is_model_card','custitem_bsg_rental_rate_data']
				});
				if(itemLookup.custitem_bsg_item_is_model_card){
					if (nrec.hasSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:i})){
						//This Is A Sale
						invDetail = nrec.getSublistSubrecord({
							sublistId:'item',
							fieldId:'inventorydetail',
							line:i
						});
						log.debug({'title':'HAS INV DETAIL',details:'HAS INV DETAIl'});
						if(invDetail){
							var curInvDetailJSON = [];
							assetCardRes = bsgCore.getAssetCardsFromInventoryDetail(invDetail,'issueinventorynumber');
							for(z = 0; z < assetCardRes.length; z++){
								var assetDetail = search.lookupFields({
									type: 'customrecord_bsg_asset_card',
									id: assetCardRes[z].id,
									columns: assetColumns
								});
								curInvDetailJSON.push(assetDetail);
							}
							invDetailLineJSON.push(curInvDetailJSON);
						}else{
							invDetailLineJSON.push([]);
						}
					}else{
						invDetailLineJSON.push([]);
					}
				}else{
					//This Is A Rental Or Lease
					curAsset = nrec.getSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card',line:i});
					if (curAsset){
						var assetDetail = search.lookupFields({
							type: 'customrecord_bsg_asset_card',
							id: curAsset,
							columns: assetColumns
						});
						assetCardLineJSON.push(assetDetail);
					}else{
						//Not An Asset Card Or Model Card Line
						assetCardLineJSON.push({});
						invDetailLineJSON.push([]);
					}
				}
			}
			record.submitFields({
				type: nrec.type,
				id: nrec.id,
				values:{
					custbody_bsg_so_asset_card_line_json: JSON.stringify(assetCardLineJSON),
					custbody_bsg_so_inv_detail_line_json: JSON.stringify(invDetailLineJSON)
				}
			});
		}
		return{
			beforeLoad: beforeLoad,
			afterSubmit: afterSubmit
		};
	}
);