/**
 * bsg_rentals_quote_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NAmdConfig ./bsg_rental_module_config.json
 */
define(['N/record', 'N/search', 'N/redirect', 'N/runtime', 'accountSettings', 'addressLib', '../BSG_Library_Modules/bsg_module_core.js', './bsg_module_rental_utility.js'],
	function(record, search, redirect, runtime, accountSettings, addressLib, bsgCore, rentalUtility){
		function beforeLoad(context){
			var form = context.form;
			var nrec = context.newRecord;
			var curScript = runtime.getCurrentScript();
			var rentalDepartment = curScript.getParameter({name:'custscript_bsg_rentquote_ue_rental_dept'});
			var rentalClass = curScript.getParameter({name:'custscript_bsg_rentquote_ue_rental_class'});
			var settings = accountSettings.getSettings();
			if(context.type == 'create' && runtime.executionContext == runtime.ContextType.USER_INTERFACE && context.request && context.request.parameters && context.request.parameters.rental_id){
				if(settings.getValue({fieldId:'custrecord_bsg_settings_eqr_quote_form'})){
					if(nrec.getValue({fieldId:'customform'}) != settings.getValue({fieldId:'custrecord_bsg_settings_eqr_quote_form'})){
						redirect.toTaskLink({
							id: 'EDIT_TRAN_ESTIMATE',
							parameters: {
								cf: settings.getValue({fieldId:'custrecord_bsg_settings_eqr_quote_form'}),
								rental_id: context.request.parameters.rental_id
							}
						});
					}
				}
			}
			if(nrec.getValue({fieldId:'customform'}) == settings.getValue({fieldId:'custrecord_bsg_settings_eqr_quote_form'})){
				log.debug({title:'CUSTOM FORM',details:'IS RENTAL QUOTE FORM'});
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

					if(context.type == 'create'){
						// rec.setValue({fieldId:'shipToSelect',value:''});
						nrec.setValue({fieldId:'shipaddress',value:' '});
						nrec.setValue({fieldId:'department',value:rentalDepartment});
						nrec.setValue({fieldId:'class',value:rentalClass});
					}

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
					var itemSublist = form.getSublist({id:'item'});
					var itemField = itemSublist.getField({id:'item'});
					itemField.updateDisplayType({displayType:'disabled'});
				}
				if(context.type == 'create' && runtime.executionContext == runtime.ContextType.USER_INTERFACE){
					if(context.request.parameters && context.request.parameters.rental_id){
						populateRentalQuoteData(context);
					}
				}
			}
			if(context.type == 'view'){
				if(nrec.getValue({fieldId:'custbody_bsg_rental_rate_line_json'}) && !nrec.getValue({fieldId:'custbody_bsg_eqr_reservation_id'})){
					form.addButton({
						id: 'custpage_create_rental_agreement_btn',
						label: 'Create Rental Agreement',
						functionName: 'createRentalAgreement'
					});
					form.clientScriptModulePath = './bsg_rentals_reservation_module';
				}
			}

			//Add Rental Rate HTML Field
			var rentalRatePopupHTML = form.addField({
				id: 'custpage_rental_rate_html',
				label: 'Rental Rate HTML',
				type: 'longtext'
			});
			rentalRatePopupHTML.updateDisplayType({displayType:'hidden'});
			rentalRatePopupHTML.defaultValue = '<table style="width:100%; text-align:center"> <tr> <th style="text-align: center; font-weight: bold; font-size: 1.2em;">Rate Category</th> <th style="text-align: center; font-weight: bold; font-size: 1.2em;">Amount</th> <th style="text-align: center; font-weight: bold; font-size: 1.2em;">Set Default</th> </tr> <tr> <td>Daily</td><td><input type="text" id="inpt_rental_rates_daily" value=""/></td><td><input type="radio" id="inpt_rental_rates_radio_daily" rrCat="1" name="inpt_rental_rates_default" value="daily"/></td> </tr> <tr> <td>Weekly</td><td><input type="text" id="inpt_rental_rates_weekly" value=""/></td><td><input type="radio" id="inpt_rental_rates_radio_weekly" rrCat="2" name="inpt_rental_rates_default" value="weekly"/></td> </tr> <tr> <td>Monthly</td><td><input type="text" id="inpt_rental_rates_monthly" value=""/></td><td><input type="radio" id="inpt_rental_rates_radio_monthly" rrCat="3" name="inpt_rental_rates_default" value="monthly"/></td> </tr> </table> <br/><br/> <table border="0" cellspacing="0" cellpadding="0" role="presentation"><tbody><tr><td> <table id="tbl_secondaryok" cellpadding="0" cellspacing="0" border="0" class="uir-button" style="margin-right:6px;cursor:hand;" role="presentation"> <tbody><tr id="tr_secondaryok" class="pgBntG pgBntB"> <td id="tdleftcap_secondaryok"><img src="/images/nav/ns_x.gif" class="bntLT" border="0" height="50%" width="3" alt=""> <img src="/images/nav/ns_x.gif" class="bntLB" border="0" height="50%" width="3" alt=""> </td> <td id="tdbody_secondaryok" height="20" valign="top" nowrap="" class="bntBgB"> <input type="button" style="" class="rndbuttoninpt bntBgT" value="OK" id="secondaryok" name="secondaryok" onclick="saveRentalRates(); return false;" onmousedown="this.setAttribute(\'_mousedown\',\'T\'); setButtonDown(true, false, this);" onmouseup="this.setAttribute(\'_mousedown\',\'F\'); setButtonDown(false, false, this);" onmouseout="if(this.getAttribute(\'_mousedown\')==\'T\') setButtonDown(false, false, this);" onmouseover="if(this.getAttribute(\'_mousedown\')==\'T\') setButtonDown(true, false, this);" _mousedown="F"></td> <td id="tdrightcap_secondaryok"> <img src="/images/nav/ns_x.gif" height="50%" class="bntRT" border="0" width="3" alt=""> <img src="/images/nav/ns_x.gif" height="50%" class="bntRB" border="0" width="3" alt=""> </td> </tr> </tbody></table> </td><td> <table id="tbl_secondaryclose" cellpadding="0" cellspacing="0" border="0" class="uir-button" style="margin-right:6px;cursor:hand;" role="presentation"> <tbody><tr id="tr_secondaryclose" class="pgBntG"> <td id="tdleftcap_secondaryclose"><img src="/images/nav/ns_x.gif" class="bntLT" border="0" height="50%" width="3" alt=""> <img src="/images/nav/ns_x.gif" class="bntLB" border="0" height="50%" width="3" alt=""> </td> <td id="tdbody_secondaryclose" height="20" valign="top" nowrap="" class="bntBgB"> <input type="button" style="" class="rndbuttoninpt bntBgT" value="Cancel" id="secondaryclose" name="secondaryclose" onclick="closeRentalRateWindow(); return false;" onmousedown="this.setAttribute(\'_mousedown\',\'T\'); setButtonDown(true, false, this);" onmouseup="this.setAttribute(\'_mousedown\',\'F\'); setButtonDown(false, false, this);" onmouseout="if(this.getAttribute(\'_mousedown\')==\'T\') setButtonDown(false, false, this);" onmouseover="if(this.getAttribute(\'_mousedown\')==\'T\') setButtonDown(true, false, this);"></td> <td id="tdrightcap_secondaryclose"> <img src="/images/nav/ns_x.gif" height="50%" class="bntRT" border="0" width="3" alt=""> <img src="/images/nav/ns_x.gif" height="50%" class="bntRB" border="0" width="3" alt=""> </td> </tr> </tbody></table> </td></tr></tbody></table>';

			//Add Rental Rate HTML Field
			var rentalRatePopupScript = form.addField({
				id: 'custpage_rental_rate_script',
				label: 'Rental Rate HTML',
				type: 'inlinehtml'
			});
			rentalRatePopupScript.defaultValue = '<script type="text/javascript">var RENTAL_RATE_COLLECTION = {by_asset: {}, by_item: {} }; function openRentalRateWindow() {var rentalLineData = nlapiGetFieldValue("custbody_bsg_rental_rate_line_data"); if(rentalLineData){rentalLineData = JSON.parse(rentalLineData); }else{rentalLineData = {}; } var curLineData = null; var curLine = parseInt(nlapiGetCurrentLineItemIndex("item")) - 1; curLineData = rentalLineData["line_"+curLine]; var wHtml = nlapiGetFieldValue("custpage_rental_rate_html"); nlExtOpenDivWindow("Rental_Rates", 600, 250, null, null, "Rental Rates", null, wHtml); if(!curLineData){var rentalRates = getRentalRates(); console.log("RENTAL RATES", rentalRates); if(rentalRates){rentalLineData["line_"+curLine] = {daily: {value: rentalRates.Daily, selected: false }, weekly: {value: rentalRates.Weekly, selected: false }, monthly: {value: rentalRates.Monthly, selected: false }, }; nlapiSetFieldValue("custbody_bsg_rental_rate_line_data",JSON.stringify(rentalLineData)); curLineData = rentalLineData["line_"+curLine]; } } if(curLineData){for(var line in curLineData){document.getElementById("inpt_rental_rates_"+line).value = curLineData[line].value; if(curLineData[line].selected){document.getElementById("inpt_rental_rates_radio_"+line).checked = true; } } } } function getRentalRates(){var curAsset = nlapiGetCurrentLineItemValue("item","custcol_bsg_asset_card_rent"); var searchByItem = false; if(curAsset){console.log("RCOLLECTION - BY ASSET",RENTAL_RATE_COLLECTION.by_asset[curAsset]); if(RENTAL_RATE_COLLECTION.by_asset[curAsset]){if(RENTAL_RATE_COLLECTION.by_asset[curAsset]){return RENTAL_RATE_COLLECTION.by_asset[curAsset]; }else{searchByItem = true; } }else{var assetRates = nlapiSearchRecord("customrecord_bsg_rental_asset_rates",null, [["custrecord_bsg_rental_asset_rates_asset","is",curAsset]], [new nlobjSearchColumn("custrecord_bsg_rental_asset_rates_cat"), new nlobjSearchColumn("custrecord_bsg_rental_asset_rates_rate")] ); console.log("ASSET RATES RESULTS",assetRates); if(assetRates){var tempObj = {}; for(var i = 0; i < assetRates.length; i++){tempObj[assetRates[i].getText("custrecord_bsg_rental_asset_rates_cat")] = assetRates[i].getValue("custrecord_bsg_rental_asset_rates_rate"); } RENTAL_RATE_COLLECTION.by_asset[curAsset] = tempObj; return RENTAL_RATE_COLLECTION.by_asset[curAsset]; }else{searchByItem = true; } } }else{searchByItem = true; } if(searchByItem){var curItem = nlapiGetCurrentLineItemValue("item","custcol_bsg_eqr_rental_item"); if(curItem){console.log("RCOLLECTION - BY ITEM",RENTAL_RATE_COLLECTION.by_item[curItem]); if(RENTAL_RATE_COLLECTION.by_item[curItem]){return RENTAL_RATE_COLLECTION.by_item[curItem]; }else{var itemRates = nlapiSearchRecord("customrecord_bsg_rental_item_rates",null, [["custrecord_bsg_rental_item_rates_item","is",curItem]], [new nlobjSearchColumn("custrecord_bsg_rental_item_rates_cat"), new nlobjSearchColumn("custrecord_bsg_rental_item_rates_rate")] ); console.log("ITEM RATES RESULTS",itemRates); if(itemRates){var tempObj = {}; for(var i = 0; i < itemRates.length; i++){tempObj[itemRates[i].getText("custrecord_bsg_rental_item_rates_cat")] = itemRates[i].getValue("custrecord_bsg_rental_item_rates_rate"); } RENTAL_RATE_COLLECTION.by_item[curItem] = tempObj; return RENTAL_RATE_COLLECTION.by_item[curItem]; } } } } return false; } function saveRentalRates(){var rentalLineData = nlapiGetFieldValue("custbody_bsg_rental_rate_line_data"); if(rentalLineData){rentalLineData = JSON.parse(rentalLineData); }else{rentalLineData = {}; } var curLine = parseInt(nlapiGetCurrentLineItemIndex("item")) - 1; rentalLineData["line_"+curLine] = {daily: {value: document.getElementById("inpt_rental_rates_daily").value, selected: document.getElementById("inpt_rental_rates_radio_daily").checked }, weekly: {value: document.getElementById("inpt_rental_rates_weekly").value, selected: document.getElementById("inpt_rental_rates_radio_weekly").checked }, monthly: {value: document.getElementById("inpt_rental_rates_monthly").value, selected: document.getElementById("inpt_rental_rates_radio_monthly").checked }, }; for(var line in rentalLineData["line_"+curLine]){if(rentalLineData["line_"+curLine][line].selected){nlapiSetCurrentLineItemValue("item","rate",parseFloat(document.getElementById("inpt_rental_rates_"+line).value)); } } nlapiSetFieldValue("custbody_bsg_rental_rate_line_data",JSON.stringify(rentalLineData)); closeRentalRateWindow(); } function closeRentalRateWindow() {document.getElementsByClassName("x-tool-close")[0].click(); }</script>';
		}

		function beforeSubmit(context){
			// var nrec = context.newRecord;
			// var rentalLineData = nrec.getValue({fieldId:"custbody_bsg_rental_rate_line_data"});

			// log.debug({title:"RENTAL LINE DATA", details: rentalLineData});

			// if(rentalLineData){
			// 	rentalLineData = JSON.parse(rentalLineData);
			// }else{
			// 	return true;
			// }

			// //This object is relative to the Rental Rate Categories custom list in NS.
			// var rentalRateCatObj = {
			// 	daily: 1,
			// 	weekly: 2,
			// 	monthly: 3
			// }

			// var itemLineCount = nrec.getLineCount({sublistId:'item'});
			// for(var i = 0; i < itemLineCount; i++){
			// 	if(rentalLineData['line_'+i]){
			// 		log.debug({title:"RENTAL LINE DATA [I]", details: rentalLineData['line_'+i]});
			// 		for (var d in rentalLineData['line_'+i]){
			// 			log.debug({title:"D", details: d});
			// 			log.debug({title:"RENTAL LINE DATA [I][D]", details: rentalLineData['line_'+i][d]});
			// 			if(rentalLineData['line_'+i][d].selected){
			// 				nrec.setSublistValue({sublistId:'item', fieldId:'custcol_bsg_rental_rate_category', value: rentalRateCatObj[d], line:i});
			// 			}
			// 		}
			// 	}
			// }

			// return true;
		}

		function populateRentalQuoteData(context){
			var quoteRec = context.newRecord;
			var rentalRec = record.load({type: 'customrecord_bsg_eqr_reservation', id: context.request.parameters.rental_id});
			var settings = accountSettings.getSettings();
			var lineCount = rentalRec.getLineCount({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation'});
			var rentalItem = settings.getValue({fieldId:'custrecord_bsg_eqr_settings_item'});

			var curScript = runtime.getCurrentScript();
			var rentalDepartment = curScript.getParameter({name:'custscript_bsg_rentquote_ue_rental_dept'});
			var rentalClass = curScript.getParameter({name:'custscript_bsg_rentquote_ue_rental_class'});

			quoteRec.setValue({fieldId:'entity', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_res_customer'})});
			quoteRec.setValue({fieldId:'custbody_bsg_asset_assigned_customer', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_ship_to_customer'})});
			quoteRec.setValue({fieldId:'custbody_bsg_eqr_reservation_id', value: rentalRec.id});
			quoteRec.setValue({fieldId:'department', value: rentalDepartment}); //RENTALS
			quoteRec.setValue({fieldId:'class', value: rentalClass}); //RENTALS : Forklift
			quoteRec.setValue({fieldId:'location', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_res_loc'})});
			quoteRec.setValue({fieldId:'memo', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_memo'})});
			quoteRec.setValue({fieldId:'discountitem', value: "-6"});
			quoteRec.setValue({fieldId:'discountrate',	value: "0.00"});
			quoteRec.setValue({fieldId:'memo', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_memo'})});

			//Set Bill To and Ship To Address
			quoteRec.setValue({fieldId:'billaddresslist', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_bill_to_address'})});
			if(rentalRec.getValue({fieldId:'custrecord_bsg_eqr_ship_to_customer'}) == rentalRec.getValue({fieldId:'custrecord_bsg_eqr_res_customer'})){
				quoteRec.setValue({fieldId:'shipaddresslist', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_ship_to_address'})});
			}else{
				quoteRec.setValue({fieldId:'shipaddresslist', value: -2}); //Set To Custom
				quoteRec.setValue({fieldId:'shipaddress', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_ship_to_addr_text'})});
			}
			var shipToAddress = context.form.getField({id:'custpage_ship_to_address'});
			shipToAddress = addressLib.populateAddressBook({
				customerRecordId: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_ship_to_customer'}),
				scriptType: 'UserEventScript',
				defaultValue: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_ship_to_address'}),
				field: shipToAddress
			});

			var lastInvDate = null;
			if(rentalRec.getValue({fieldId:'custrecord_bsg_eqr_last_bill_date'})){
				//lastInvDate = moment(rentalRec.getValue({fieldId:'custrecord_bsg_eqr_last_bill_date'}));
				lastInvDate = (rentalRec.getValue({fieldId:'custrecord_bsg_eqr_last_bill_date'}));
			}

			for (var i = 0; i < lineCount; i++){
				var itm = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_item', line: i});
				var description = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_description', line: i});
				var qty = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_qty', line: i});
				var rate = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_rate', line: i});
				var rateCategory = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_rate_cat', line: i});
				var assetCard = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_asset', line: i});
				var addAssetCardRent = false;
				var startDate = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_start', line: i});
				var endDate = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_end', line: i});
				var billPdStart, billPdEnd;

				if(assetCard){
					var assetLookup = search.lookupFields({
						type: 'customrecord_bsg_asset_card',
						id: assetCard,
						columns: 'custrecord_bsg_asset_status'
					});
					if(assetLookup && assetLookup.custrecord_bsg_asset_status && assetLookup.custrecord_bsg_asset_status.length){
						if(assetLookup.custrecord_bsg_asset_status[0].value == 23){ //Available For Rent
							addAssetCardRent = true;
						}
					}
				}

				var rentalRateData = {
					Daily: rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_daily', line: i}) || 0,
					Weekly: rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_weekly', line: i}) || 0,
					Monthly: rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_monthly', line: i}) || 0
				};
				var rates = [];

				if(!rentalRateData.Monthly){
					//Pull From Asset Card
					if(assetCard){
						rates = rentalUtility.getAssetRentalRates(assetCard);
						if(rates.length){
							for(var z=0; z<rates.length; z++){
								rentalRateData[rates[z].getText({name:'custrecord_bsg_rental_asset_rates_cat'})] = rates[z].getValue({name:'custrecord_bsg_rental_asset_rates_rate'});
							}
						}
					}
					if(!rentalRateData.Monthly){
						rates = rentalUtility.getItemRentalRates(itm);
						if(rates.length){
							for(var z=0; z<rates.length; z++){
								rentalRateData[rates[z].getText({name:'custrecord_bsg_rental_item_rates_cat'})] = rates[z].getValue({name:'custrecord_bsg_rental_item_rates_rate'});
							}
						}
					}
				}

				if(!rentalRateData.Daily)
					rentalRateData.Daily = 0;
				if(!rentalRateData.Weekly)
					rentalRateData.Weekly = 0;
				if(!rentalRateData.Monthly)
					rentalRateData.Monthly = 0;

				log.debug({title:'RATE BEFORE CALC',details:rentalRateData});
				var rateData = rentalUtility.calculateBestRate(startDate, endDate, billPdStart, billPdEnd, lastInvDate, rate, rateCategory, qty, rentalRateData);
				log.debug({title:'RATE DATA',details:rateData});

				quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'item',value:rentalItem});
				quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item',value:itm});
				quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'description',value:description});
				quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'custcol_bsg_rental_rate_category',value:rateData.rate_category});
				if(addAssetCardRent){
					quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'custcol_bsg_asset_card_rent',value:assetCard});
				}
				quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'custcol_bsg_asset_card',value:assetCard});
				quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'quantity',value:rateData.quantity});
				quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'price',value:-1});
				quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'rate',value:rateData.rate});
				quoteRec.setSublistValue({line:i, sublistId:'item',fieldId:'amount',value:parseFloat(rateData.rate)*parseFloat(rateData.quantity)});
			}
		}
		return{
			beforeLoad: beforeLoad,
			beforeSubmit: beforeSubmit
		};
	}
);