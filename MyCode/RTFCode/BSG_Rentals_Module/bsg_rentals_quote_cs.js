/**
 * bsg_rentals_quote_cs.js
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NAmdConfig ./bsg_rental_module_config.json
 */
define(['N/record', 'N/search', 'N/runtime', './bsg_rentals_reservation_module', 'addressLib'],
	function(record, search, runtime, rentalMod, addressLib){
		var RENTAL_RATE_COLLECTION = {
			by_item: {},
			by_asset: {}
		};
		var RENTAL_PRINT_COLLECTION = {
			by_item: {},
			by_asset: {}
		};
		var ITEM_COLLECTION = {};

		function pageInit(context){
			var curRec = context.currentRecord;
			var curScript = runtime.getCurrentScript();
			var rentalQuoteFormId = curScript.getParameter({name:'custscript_bsg_rentquote_cs_rental_form'});
			
			if(curRec.getValue({fieldId:'customform'}) == rentalQuoteFormId){
				if(curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}) && curRec.getValue({fieldId:'custpage_ship_to_address'})){
					curRec.setValue({fieldId:'shipaddress',
						value: addressLib.getAddressText({
							customerRecordId: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
							selectedAddress: curRec.getValue({fieldId:'custpage_ship_to_address'})
						})
					});
				}
				if(context.mode == 'edit'){
					var rentalLineJSON = curRec.getValue({fieldId:'custbody_bsg_rental_rate_line_json'});
					if(rentalLineJSON){
						try{
							rentalLineJSON = JSON.parse(rentalLineJSON);
						}catch(e){
							rentalLineJSON = {};
						}
					}
					if(rentalLineJSON && rentalLineJSON.rental_rate_collection && rentalLineJSON.rental_print_collection){
						RENTAL_RATE_COLLECTION = rentalLineJSON.rental_rate_collection;
						RENTAL_PRINT_COLLECTION = rentalLineJSON.rental_print_collection;
					}
				}

				//Remove Rate Category From Line Items
				var lineCount = curRec.getLineCount({sublistId:'item'});
				for(var i = 0; i < lineCount; i++){
					curRec.selectLine({sublistId:'item', line:i});
					curRec.setCurrentSublistValue({sublistId:'item', fieldId:'custcol_bsg_rental_rate_category', value: null, ignoreFieldChange: true});
					curRec.commitLine({sublistId:'item'});
				}

				var rentalRateButtonHtml = "<span class=\"always-visible field_widget_boxpos uir-summary-field-helper  \" style=\"left: 0px;\"><a id=\"itemvendorprice_helper_popup\" data-helperbuttontype=\"\" class=\"smalltextul i_itemvendorpriceneeded i_itemvendorpriceneeded i_itemvendorpriceneeded i_itemvendorpriceneeded i_itemvendorpriceneeded i_itemvendorpriceneeded\" title=\"Set Rental Rates\" href=\"#\" style=\"\" onclick=\"openRentalRateWindow();;return false;\" aria-label=\"Set\" role=\"button\" onkeypress=\"if (getEventKeypress(event) == 32) {openRentalRateWindow();; setEventPreventDefault(event); }\"></a></span>";
				var rateCatField = document.getElementById("item_custcol_bsg_rental_rate_category_fs");
				if(rateCatField){
					rateCatField.innerHTML = rentalRateButtonHtml;
				}
			}
		}

		function validateDelete(context){
			var curRec = context.currentRecord;
			if(context.sublistId == 'item'){
				var curLine = curRec.getCurrentSublistIndex('item');

				var rentalLineData = curRec.getValue({fieldId:"custbody_bsg_rental_rate_line_data"});
				if(rentalLineData){
					rentalLineData = JSON.parse(rentalLineData);
				}else{
					return true;
				}

				delete rentalLineData[curLine];
				var nRentalLineObj = {};
				var i = 0;
				for(var line in rentalLineData){
					nRentalLineObj['line_'+i] = rentalLineData[line];
					i++;
				}
				rentalLineData = nRentalLineObj;
				curRec.setValue({fieldId:"custbody_bsg_rental_rate_line_data",value:JSON.stringify(rentalLineData)});
				return true;
			}
		}

		function validateInsert(context){
			var curRec = context.currentRecord;
			if(context.sublistId == 'item'){
				var curLine = curRec.getCurrentSublistIndex('item');
				console.log('CUR LINE', curLine);

				var rentalLineData = curRec.getValue({fieldId:"custbody_bsg_rental_rate_line_data"});
				if(rentalLineData){
					rentalLineData = JSON.parse(rentalLineData);
				}else{
					return true;
				}

				var nRentalLineObj = {};

				var i = 0;
				console.log('RENTAL LINE DATA', rentalLineData);
				for(var line in rentalLineData){
					if(i == curLine){
						i++;
					}

					nRentalLineObj['line_'+i] = rentalLineData[line];
					i++;
				}
				rentalLineData = nRentalLineObj;
				console.log('nRentalLineObj', nRentalLineObj);
				curRec.setValue({fieldId:"custbody_bsg_rental_rate_line_data",value:JSON.stringify(rentalLineData)});

				return true;
			}
		}

		function validateField(context){
			var curRec = context.currentRecord;
			var curScript = runtime.getCurrentScript();
			var rentalQuoteFormId = curScript.getParameter({name:'custscript_bsg_rentquote_cs_rental_form'});
			if(curRec.getValue({fieldId:'customform'}) == rentalQuoteFormId){
				switch(context.fieldId){
					case 'entity':
						var curShipTo = curRec.getValue({fieldId:'shipaddress'});
						setTimeout(function(){
					//		curRec.setValue({fieldId:'shipaddress',value:curShipTo})
						},400);
						break;
				}
			}
			return true;
		}

		function fieldChanged(context){
			var curRec = context.currentRecord;
			var curScript = runtime.getCurrentScript();
			var rentalItemId = curScript.getParameter({name:'custscript_bsg_rentquote_cs_rental_item'}); //Rental 1
			var rentalQuoteFormId = curScript.getParameter({name:'custscript_bsg_rentquote_cs_rental_form'});
			
		//	if(curRec.getValue({fieldId:'customform'}) == rentalQuoteFormId){
				
				switch(context.fieldId){
					
				case 'entity':
					//Populate The Custom Select Of Contacts
					var curEntity = curRec.getValue({fieldId:context.fieldId});
					curRec.setValue({fieldId:'custbody_bsg_asset_assigned_customer',
						value:curRec.getValue({fieldId:'entity'}),
						ignoreFieldChange: false
						});
					var defaultShippingAddress = addressLib.getDefaultShippingAddress({customerRecordId:curRec.getValue({fieldId:'entity'})});

					if(defaultShippingAddress){
						log.debug({title:'DEFAULT SHIPPING ADDRESS!',details:defaultShippingAddress});
						curRec.setValue({fieldId:'custpage_ship_to_address',value:defaultShippingAddress.value});
						curRec.setValue({fieldId:'shipaddress',value: defaultShippingAddress.text});
					}
					
				break;
				
				     case 'custbody_bsg_asset_assigned_customer':
						if(curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})){
							
							var shipToAddressField = curRec.getField({fieldId:'custpage_ship_to_address'});
							var curShipToAddressId = curRec.getValue({fieldId:'custpage_ship_to_address'});
							
							shipToAddressField.removeSelectOption({value:null});
							shipToAddressField.insertSelectOption({value:' ',text:' '});
							shipToAddressField = addressLib.populateAddressBook({
								customerRecordId: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
								scriptType: 'ClientScript',
								field: shipToAddressField,
								defaultValue: curShipToAddressId
							});
							var defaultShippingAddress = addressLib.getDefaultShippingAddress({customerRecordId:curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})});

							if(defaultShippingAddress){
								log.debug({title:'DEFAULT SHIPPING ADDRESS!',details:defaultShippingAddress});
								curRec.setValue({fieldId:'custpage_ship_to_address',value:defaultShippingAddress.value});
								curRec.setValue({fieldId:'shipaddress',value: defaultShippingAddress.text});
							}
							
							var custSearch = search.lookupFields({
								type: 'customer',
								id: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
								columns: ['custentity_bsg_primary_contact','custentity_bsg_preferred_tech']
							});
							if(custSearch.custentity_bsg_primary_contact.length){
								curRec.setValue({fieldId:'custbody_bsg_primary_contact',value:custSearch.custentity_bsg_primary_contact[0].value});
							}
							if(custSearch.custentity_bsg_preferred_tech.length){
								curRec.setValue({fieldId:'custbody_bsg_assigned_tech',value:custSearch.custentity_bsg_preferred_tech[0].value});
							}
						}
						quotePopulatePrimary(context, context.fieldId);
						break;
					case 'custpage_ship_to_address':
						/*curRec.setValue({
							fieldId:'shipaddress',
							value:addressLib.getAddressText({
								customerRecordId: curRec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
								selectedAddress: curRec.getValue({fieldId:'custpage_ship_to_address'}),
							})
						});*/
						break;
					case 'custcol_bsg_eqr_rental_item':
						if(curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item'})){
							// curRec.setCurrentSublistValue({sublistId:'item',fieldId:'item',value:rentalItemId});
							setTimeout(function(){
								if(ITEM_COLLECTION[curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item'})]){
									curRec.setCurrentSublistValue({sublistId:'item',fieldId:'description',value:ITEM_COLLECTION[curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item'})].salesdescription});;
								}else{
									var itemDetail = search.lookupFields({
										type:'item',
										id: curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item'}),
										columns: ['salesdescription']
									});
									console.log('ITEM DET',itemDetail);
									if(itemDetail.salesdescription){
										curRec.setCurrentSublistValue({sublistId:'item',fieldId:'description',value:itemDetail.salesdescription});
										ITEM_COLLECTION[curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item'})] = itemDetail;
									}
								}
							},500);
						}
						break;
					case 'custcol_bsg_asset_card_rent':
						curRec.setCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card',value:curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card_rent'})});
						break;
					case 'item':
						var curDesc = curRec.getCurrentSublistValue({sublistId:'item',fieldId:'description'});
						console.log('CURDESC',curDesc);
						if(curDesc){
							setTimeout(function(){
								if(ITEM_COLLECTION[curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item'})]){
									curRec.setCurrentSublistValue({sublistId:'item',fieldId:'description',value:ITEM_COLLECTION[curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item'})].salesdescription});;
								}
							},500);
						}
						break;
					case 'custcol_bsg_rental_category':
						var rCatLookup = search.lookupFields({
							type: 'customrecord_bsg_eqr_rental_categories',
							id: curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_rental_category'}),
							columns: 'custrecord_bsg_rental_cat_item'
						});
						if(rCatLookup.custrecord_bsg_rental_cat_item && rCatLookup.custrecord_bsg_rental_cat_item.length){
							curRec.setCurrentSublistValue({sublistId:'item',fieldId:'item',value:rCatLookup.custrecord_bsg_rental_cat_item[0].value});
						}
						break;
					case 'custcol_bsg_rental_rate_category':
						var curAsset = curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_asset_card_rent'});
						var curAssetText = curRec.getCurrentSublistText({sublistId:'item',fieldId:'custcol_bsg_asset_card_rent'});
						var curRateCat = curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_rental_rate_category'});
						var searchByItem = false;
						if(curRateCat){
							if(curAsset){
								console.log('RCOLLECTION - BY ASSET',RENTAL_RATE_COLLECTION.by_asset[curAsset]);
								if(RENTAL_RATE_COLLECTION.by_asset[curAsset]){
									if(RENTAL_RATE_COLLECTION.by_asset[curAsset][curRateCat]){
										curRec.setCurrentSublistValue({sublistId:'item',fieldId:'rate',value:RENTAL_RATE_COLLECTION.by_asset[curAsset][curRateCat]});
									}else{
										searchByItem = true;
									}
								}else{
									var assetRates = rentalMod.getAssetRentalRates(curAsset);
									console.log('ASSET RATES RESULTS',assetRates);
									if(assetRates.length){
										var tempObj = {};
										var tempPrintObj = {};
										for(var i = 0; i < assetRates.length; i++){
											tempObj[assetRates[i].getValue({name:'custrecord_bsg_rental_asset_rates_cat'})] = assetRates[i].getValue({name:'custrecord_bsg_rental_asset_rates_rate'});
											tempPrintObj[assetRates[i].getText({name:'custrecord_bsg_rental_asset_rates_cat'})] = assetRates[i].getValue({name:'custrecord_bsg_rental_asset_rates_rate'});
											if(assetRates[i].getValue({name:'custrecord_bsg_rental_asset_rates_cat'}) == curRateCat){
												curRec.setCurrentSublistValue({sublistId:'item',fieldId:'rate',value:assetRates[i].getValue({name:'custrecord_bsg_rental_asset_rates_rate'})});
											}
										}
										RENTAL_RATE_COLLECTION.by_asset[curAsset] = tempObj;
										RENTAL_PRINT_COLLECTION.by_asset[curAssetText] = tempPrintObj;
									}else{
										searchByItem = true;
									}
								}
							}else{
								searchByItem = true;
							}

							if(searchByItem){
								var curItem = curRec.getCurrentSublistValue({sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item'});
								var curItemText = curRec.getCurrentSublistText({sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item'});
								if(curItem){
									console.log('RCOLLECTION - BY ITEM',RENTAL_RATE_COLLECTION.by_item[curItem]);
									if(RENTAL_RATE_COLLECTION.by_item[curItem]){
										if(RENTAL_RATE_COLLECTION.by_item[curItem][curRateCat]){
											curRec.setCurrentSublistValue({sublistId:'item',fieldId:'rate',value:RENTAL_RATE_COLLECTION.by_item[curItem][curRateCat]});
										}
									}else{
										var itemRates = rentalMod.getItemRentalRates(curItem);
										console.log('ITEM RATES RESULTS',itemRates);
										if(itemRates.length){
											var tempObj = {};
											var tempPrintObj = {};
											for(var i = 0; i < itemRates.length; i++){
												tempObj[itemRates[i].getValue({name:'custrecord_bsg_rental_item_rates_cat'})] = itemRates[i].getValue({name:'custrecord_bsg_rental_item_rates_rate'});
												tempPrintObj[itemRates[i].getText({name:'custrecord_bsg_rental_item_rates_cat'})] = itemRates[i].getValue({name:'custrecord_bsg_rental_item_rates_rate'});
												if(itemRates[i].getValue({name:'custrecord_bsg_rental_item_rates_cat'}) == curRateCat){
													curRec.setCurrentSublistValue({sublistId:'item',fieldId:'rate',value:itemRates[i].getValue({name:'custrecord_bsg_rental_item_rates_rate'})});
												}
											}
											RENTAL_RATE_COLLECTION.by_item[curItem] = tempObj;
											RENTAL_PRINT_COLLECTION.by_item[curItemText] = tempPrintObj;
										}
									}
								}
							}
						}
						break;
					default:
						break;
				}
			//}
		}

		function quotePopulatePrimary(context, myFieldId){
			
			var curRec = context.currentRecord;
			var curEntity = curRec.getValue({fieldId:myFieldId});
			
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
		}
		
		function saveRecord(context){
			var curRec = context.currentRecord;
			var curScript = runtime.getCurrentScript();
			var rentalQuoteFormId = curScript.getParameter({name:'custscript_bsg_rentquote_cs_rental_form'});
			if(curRec.getValue({fieldId:'customform'}) == rentalQuoteFormId){
				var curRec = context.currentRecord;
				var tJson = {
					rental_rate_collection: RENTAL_RATE_COLLECTION,
					rental_print_collection: RENTAL_PRINT_COLLECTION
				};
				curRec.setValue({fieldId:'custbody_bsg_rental_rate_line_json',value:JSON.stringify(tJson)});
			}
			return true;
		}

		return{
			pageInit: pageInit,
			fieldChanged: fieldChanged,
			validateDelete: validateDelete,
			validateInsert: validateInsert,
			validateField: validateField,
			saveRecord: saveRecord
		};
	}
);