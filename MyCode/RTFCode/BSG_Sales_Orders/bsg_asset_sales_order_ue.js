/**
 * bsg_asset_sales_order_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NAmdConfig ./bsg_sales_order_config.json
 */
define(['N/record', 'N/search', '../BSG_Library_Modules/bsg_module_core.js'],
	function(record, search, bsgCore){
		var ASSET_STATUS_AVAIL_FOR_RENT = 23;
		var ASSET_STATUS_AVAIL_FOR_SALE = 6;
		var ASSET_FLOW_ON_ORDER = 1;
		var ASSET_FLOW_PENIDNG_DELIVERY = 6;
		var ASSET_FLOW_READY_AND_COMPLETE = 14;
		var WORK_ORDER_FORM_ID = 115;
		var DEPT_SALES = 4;
		var DEPT_RENTAL = 5;
		var DEPT_LEASE = 12;

		function beforeLoad(context){
			//Swap Out Primary Contact Field For Custom Field To Limit Selection
			if(context.type == 'edit' || context.type == 'create'){
				var form = context.form;
				var nrec = context.newRecord;
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
				var curEntity = nrec.getValue({fieldId:'entity'});
				if(nrec.getValue({fieldId:'customform'}) == WORK_ORDER_FORM_ID){
					curEntity = nrec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'});
				}
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
		function afterSubmit(context){
			if(context.type == 'delete'){
				return false;
			}
			var nrec = context.newRecord;
			var orec = context.oldRecord;
			var assetValues = {}, curAsset, requiredStatus, i, z, itemLookup, assetCardRes, invDetail;
			var assetCardLineJSON = [];
			var invDetailLineJSON = [];
			var assetColumns = ['custrecord_bsg_asset_status','custrecord_bsg_asset_type','custrecord_bsg_asset_side_shift','custrecord_bsg_asset_serial',
				'custrecord_bsg_asset_lbr','custrecord_bsg_asset_4th_valve','custrecord_bsg_asset_mast_height','custrecord_bsg_asset_lift_height',
				'custrecord_bsg_asset_capacity','custrecord_bsg_asset_fork_size','custrecord_bsg_asset_drive_tire_type','custrecord_bsg_asset_steer_tire_type',
				'custrecord_bsg_asset_non_marking','custrecord_bsg_asset_voltage','custrecord_bsg_asset_connector_type','custrecord_bsg_asset_item_make',
				'custrecord_bsg_asset_equipment_subclass','name','custrecord_bsg_asset_built_in_charger','custrecord_bsg_asset_watering_system','custrecord_bsg_asset_hour_meter_reading'
			];
			//Update Status Of All Assets In Line Items Which Are Committed If Asset Is Available For Sale
			var nrecItemLineCount = nrec.getLineCount({sublistId:'item'});
			for(i = 0; i < nrecItemLineCount; i++){
				itemLookup = search.lookupFields({
					type:'item',
					id:nrec.getSublistValue({sublistId:'item',fieldId:'item',line:i}),
					columns:['custitem_bsg_item_is_model_card']
				});
				if(itemLookup.custitem_bsg_item_is_model_card){
					if (nrec.hasSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:i})){
						//This Is A Sale
						invDetail = nrec.getSublistSubrecord({
							sublistId:'item',
							fieldId:'inventorydetail',
							line:i
						});
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
								//Check if line should be committed. We should skip if value is Do Not Commit (3)
								if (nrec.getSublistValue({sublistId:'item',fieldId:'commitinventory',line:i}) != 3){
									//Check If Asset Is Available For Sale
									if(assetCardRes[z].getValue({name:'custrecord_bsg_asset_status'}) == ASSET_STATUS_AVAIL_FOR_SALE){
										record.submitFields({
											type: 'customrecord_bsg_asset_card',
											id: assetCardRes[z].id,
											values: {
												custrecord_bsg_flow_status:  ASSET_FLOW_PENIDNG_DELIVERY, //ASSET_FLOW_ON_ORDER, //On Order
												custrecord_bsg_asset_committed_so: nrec.id
											}
										});
									}
								}else{
									//Check If Asset Is On Order
									if(assetCardRes[z].getValue({name:'custrecord_bsg_flow_status'}) == ASSET_FLOW_ON_ORDER){
										record.submitFields({
											type: 'customrecord_bsg_asset_card',
											id: assetCardRes[z].id,
											values: {
												custrecord_bsg_flow_status: null,
												custrecord_bsg_asset_committed_so: ''
											}
										});
									}
								}
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
						assetValues = {};
						var updateAsset = false;
						requiredStatus = ASSET_STATUS_AVAIL_FOR_SALE;

						log.debug({title:'COMMITTED', details:nrec.getSublistValue({sublistId:'item',fieldId:'commitinventory',line:i})});

						switch(parseInt(nrec.getValue({fieldId:'department'}))){
							case DEPT_SALES: //Sales
								//Check if line should be committed. We should skip if value is Do Not Commit (3)
								if (nrec.getSublistValue({sublistId:'item',fieldId:'commitinventory',line:i}) != 3){
									assetValues.custrecord_bsg_flow_status = ASSET_FLOW_PENIDNG_DELIVERY; //ASSET_FLOW_ON_ORDER;
									assetValues.custrecord_bsg_asset_committed_so = nrec.id;
									requiredStatus = ASSET_STATUS_AVAIL_FOR_SALE;
								}else{
									assetValues.custrecord_bsg_flow_status = null;
									assetValues.custrecord_bsg_asset_committed_so = '';
									requiredStatus = ASSET_STATUS_AVAIL_FOR_SALE;
								}
								updateAsset = true;
								break;
							case DEPT_RENTAL: //Rentals
								assetValues.custrecord_bsg_flow_status = ASSET_FLOW_PENIDNG_DELIVERY; //ASSET_FLOW_READY_AND_COMPLETE;
								updateAsset = true;
								requiredStatus = ASSET_STATUS_AVAIL_FOR_RENT;
								break;
							case DEPT_LEASE: //Leases
								assetValues.custrecord_bsg_flow_status = ASSET_FLOW_PENIDNG_DELIVERY; //ASSET_FLOW_ON_ORDER; 
								updateAsset = true;
								requiredStatus = ASSET_STATUS_AVAIL_FOR_SALE;
								break;
						}

						var assetDetail = search.lookupFields({
							type: 'customrecord_bsg_asset_card',
							id: curAsset,
							columns: assetColumns
						});
						assetCardLineJSON.push(assetDetail);

						//Update The Asset If Necessary
						if (updateAsset){
							if (assetDetail && assetDetail.custrecord_bsg_asset_status){
								log.debug({title:'CUR ASSET STATUS', details:assetDetail.custrecord_bsg_asset_status[0].value});
								if(assetDetail.custrecord_bsg_asset_status[0].value == requiredStatus){
									record.submitFields({
										type: 'customrecord_bsg_asset_card',
										id: curAsset,
										values: assetValues
									});
								}
							}
						}
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

			//Determine If A Line Item Has Been Removed
			if(orec){
				var orecItemLineCount = orec.getLineCount({sublistId:'item'});
				var found = false;
				for(i = 0; i < orecItemLineCount; i++){
					itemLookup = search.lookupFields({
						type:'item',
						id:orec.getSublistValue({sublistId:'item',fieldId:'item',line:i}),
						columns:['custitem_bsg_item_is_model_card']
					});
					if(itemLookup.custitem_bsg_item_is_model_card){
						//This Is A Sale
						for(z = 0; z < nrecItemLineCount; z++){
							var curOrecItem = orec.getSublistValue({sublistId:'item',fieldId:'item',line:i});
							var curNrecItem = nrec.getSublistValue({sublistId:'item',fieldId:'item',line:z});
							if(curOrecItem == curNrecItem){
								found = true;
								break;
							}
						}
						if (!found && orec.hasSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:i})){
							invDetail = orec.getSublistSubrecord({
								sublistId:'item',
								fieldId:'inventorydetail',
								line:i
							});
							if(invDetail){
								assetCardRes = bsgCore.getAssetCardsFromInventoryDetail(invDetail,'issueinventorynumber');
								for(z = 0; z < assetCardRes.length; z++){
									if(assetCardRes[z].getValue({name:'custrecord_bsg_flow_status'}) == ASSET_FLOW_ON_ORDER){
										record.submitFields({
											type: 'customrecord_bsg_asset_card',
											id: assetCardRes[z].id,
											values: {
												custrecord_bsg_asset_status: ASSET_STATUS_AVAIL_FOR_SALE,
												custrecord_bsg_flow_status: null,
												custrecord_bsg_asset_committed_so: ''
											}
										});
									}
								}
							}
						}
					}else{
						//This is a Rental/Lease
						assetValues = {};
						found = false;
						var curOrecAsset = orec.getSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card',line:i});
						if(curOrecAsset){
							for(z = 0; z < nrecItemLineCount; z++){
								curAsset = nrec.getSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card',line:z});
								if(curOrecAsset == curAsset){
									found = true;
									break;
								}
							}
							if(!found){
								switch(parseInt(nrec.getValue({fieldId:'department'}))){
									case DEPT_LEASE:
									case DEPT_SALES:
										assetValues.custrecord_bsg_asset_status = ASSET_STATUS_AVAIL_FOR_SALE;
										assetValues.custrecord_bsg_flow_status = null;
										assetValues.custrecord_bsg_asset_committed_so = '';
										break;
									case DEPT_RENTAL: //Rentals
										assetValues.custrecord_bsg_asset_status = ASSET_STATUS_AVAIL_FOR_RENT;
										assetValues.custrecord_bsg_flow_status = null;
										break;
								}
								record.submitFields({
									type: 'customrecord_bsg_asset_card',
									id: curOrecAsset,
									values: assetValues
								});
							}
						}
					}
				}
			}
		}
		return{
			beforeLoad: beforeLoad,
			afterSubmit: afterSubmit
		};
	}
);