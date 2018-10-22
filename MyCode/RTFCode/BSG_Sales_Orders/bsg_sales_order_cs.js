/**
 * bsg_sales_order_cs.js
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 */
define(['N/search'],
	function(search) {
		var DEPT_SALES = 4;

		function lineInit(context){
			var curRec = context.currentRecord;
			if (context.sublistId == 'item'){
				//Disable custcol_bsg_asset_card Field -- Using the Asset Card (Sale) or Asset Card (Rent) fields for filtering purposes
				try{
					var assetCardField = curRec.getSublistField({sublistId:'item',fieldId:'custcol_bsg_asset_card',line:curRec.getCurrentSublistIndex({sublistId:'item'})});
					assetCardField.isDisabled = true;
				}catch(e){
					//This is throwing an error for some reason when it goes to a new line.
					//Placed Try/Catch to prevent fatal error.
				}
			}
		}
		function fieldChanged(context){
			var curRec = context.currentRecord;
			switch(context.fieldId){
				case 'custcol_bsg_asset_card_rent':
					curRec.setCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card',value:curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card_rent'})});
					break;
				case 'custcol_bsg_asset_card_lease':
					curRec.setCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card',value:curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card_lease'})});
					break;
				case 'custcol_bsg_asset_card_sale':
					curRec.setCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card',value:curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card_sale'})});
					if (curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card'})){
						if (curRec.getValue({fieldId:'department'}) == DEPT_SALES){ //Determine If Sales Department (4)
							var assetDetail = search.lookupFields({
								type: 'customrecord_bsg_asset_card',
								id: curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card'}),
								columns: ['custrecord_bsg_asset_sell_price']
							});
							if (assetDetail && assetDetail.custrecord_bsg_asset_sell_price){
								curRec.setCurrentSublistValue({sublistId:'item',fieldId:'rate',value:parseInt(assetDetail.custrecord_bsg_asset_sell_price)});
							}
						}
					}
					break;
				case 'custpage_bsg_primary_contact':
					curRec.setValue({fieldId:'custbody_bsg_primary_contact',value:curRec.getValue({fieldId:'custpage_bsg_primary_contact'})});
					break;
				case 'entity':
					break;
				case 'custbody_bsg_asset_assigned_customer':
					//Populate The Custom Select Of Contacts
					var curEntity = curRec.getValue({fieldId:context.fieldId});
					if(curEntity){
						var custPrimaryContactField = curRec.getField({fieldId:'custpage_bsg_primary_contact'});
						var curPrimary = curRec.getValue({fieldId:'custbody_bsg_primary_contact'});
						custPrimaryContactField.removeSelectOption({value:null});

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
						var contactRes = contactSearch.run().getRange.promise({start:0,end:100}).then(function(resp){
							custPrimaryContactField.insertSelectOption({
								value: " ",
								text: "&nbsp;",
								isSelected: true
							});
							var isSelected = false;
							for(var i = 0; i < resp.length; i++){
								isSelected = false;
								if(curPrimary && resp[i].id == curPrimary){
									isSelected = true;
								}
								custPrimaryContactField.insertSelectOption({
									value: resp[i].id,
									text: resp[i].getValue({name: 'entityid'}),
									isSelected: isSelected
								});
							}
							if (!isSelected){
								curRec.setValue({fieldId:'custbody_bsg_primary_contact',value:curRec.getValue({fieldId:'custpage_bsg_primary_contact'})});
							}
						});
					}
					break;
			}
		}
		return {
			fieldChanged: fieldChanged,
			lineInit: lineInit,
		};
	}
);