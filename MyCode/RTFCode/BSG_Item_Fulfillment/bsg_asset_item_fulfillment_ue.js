/**
 * bsg_asset_item_fulfillment_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NAmdConfig ../BSG_Library_Modules/bsg_module_core_config.json
 */
define(['N/record', 'N/search', '../BSG_Library_Modules/bsg_module_core.js','N/task'],
	function(record, search, bsgCore,task){
		function afterSubmit(context){

			if(context.type == 'delete'){
				return false;
			}
            var itemsFulfilled =[];
			var nrec = context.newRecord;
			if (nrec.getValue({fieldId:'createdfrom'})){
				var soDetail = search.lookupFields({
					type: 'salesorder',
					id: nrec.getValue({fieldId:'createdfrom'}),
					columns: ['department']
				});
	  			if (soDetail && soDetail.department){
					nrec = record.load({
						type: 'itemfulfillment',
						id: nrec.id
					});
					for(var i = 0; i < nrec.getLineCount({sublistId:'item'}); i++){
						if (nrec.getSublistValue({sublistId:'item',fieldId:'itemreceive',line:i})){
							var itemDetail = search.lookupFields({
								type: 'inventoryitem',
								id: nrec.getSublistValue({sublistId:'item',fieldId:'item',line:i}),
								columns: ['custitem_bsg_item_is_model_card']
							});
							if (itemDetail && itemDetail.custitem_bsg_item_is_model_card){
								//Get Inventory Detail
								if (nrec.hasSublistSubrecord({sublistId:'item',fieldId:'inventorydetail',line:i})){
									var invDetail = nrec.getSublistSubrecord({
										sublistId:'item',
										fieldId:'inventorydetail',
										line:i
									});
									if(invDetail){
										log.debug({title:'INV DETAIL',details:invDetail});
										var assetCardRes = bsgCore.getAssetCardsFromInventoryDetail(invDetail,'issueinventorynumber');
                                      log.debug({title:'ASSET CARDS ', details:assetCardRes});
										var assetStatus = 14; //Sold
										for(z = 0; z < assetCardRes.length; z++){
											if(assetCardRes[z].getValue({name:'custrecord_bsg_flow_status'}) == 1 || assetCardRes[z].getValue({name:'custrecord_bsg_asset_status'}) == 6){
												//Asset Status Is Either On Order Or Available For Sale
												var assetValues = {
													custrecord_bsg_asset_status: 14, //Sold
													custrecord_bsg_asset_billing_customer: nrec.getValue('entity'),
													custrecord_bsg_asset_assigned_customer: nrec.getValue('entity'),
													custrecord_bsg_flow_status: null
												};
												var shipAddress = nrec.getValue({fieldId:'shipaddresslist'});
												var shipAddressText = nrec.getValue({fieldId:'shipaddress'});

												if(shipAddressText instanceof Array){
													shipAddressText = shipAddressText[0];
												}

												if(shipAddress){
													assetValues.custrecord_bsg_asset_location_address = shipAddress;
													assetValues.custrecord_bsg_asset_card_loc_addr_text = shipAddressText;
                                                  	assetValues.custrecord_bsg_asset_location = shipAddress;
												}
												record.submitFields({
													type: 'customrecord_bsg_asset_card',
													id: assetCardRes[z].id,
													values: assetValues
												});
											}
											itemsFulfilled.push(assetCardRes[z].id);
										}
                                   
									}
								}
							}
						}
							
					}
					log.debug('how many Items ',itemsFulfilled);
					  var soId = nrec.getValue({fieldId: 'createdfrom'});
                             var mapReduce = task.create({
                              taskType: task.TaskType.MAP_REDUCE,
                              scriptId: 'customscript_bsg_child_asset_automation',
                              deploymentId: 'customdeploy_bsg_child_asset_automation',
                              params: { custscript_assets_to_process : itemsFulfilled,
                            	  custscript_so_id : soId }
                          });
						var  mrID = mapReduce.submit();
				}
			}
		}
  
		return{
			afterSubmit: afterSubmit
		};
	}
);