/**
 * bsg_rentals_so_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NAmdConfig ./bsg_rental_module_config.json
 */
define(['N/record','N/runtime','N/search','N/redirect','accountSettings','addressLib','../BSG_Library_Modules/moment-timezone.min','./bsg_module_rental_utility'],
	function(record, runtime, search, redirect, accountSettings, addressLib, moment, rentalUtility){
		var rentalRec;
		function beforeLoad(context){
			var nrec = context.newRecord;
			log.debug({title:'CONTEXT',details:context.type});
			if(context.type == 'create' && runtime.executionContext == runtime.ContextType.USER_INTERFACE){
				try{
					if(context.request.parameters && context.request.parameters.rental_id){
						populateRentalOrderData(context);
					}
				}catch(e){
					log.debug({title:'ERROR',details:e.message});
				}
			}

			//Handle Custom Shipping Address For Rentals
			var form = context.form;
			var curScript = runtime.getCurrentScript();
		}	

		function populateRentalOrderData(context){
			log.debug({title:'POPULATING',details:'POPULATING'});
			var orderRec = context.newRecord;
			rentalRec = record.load({type: 'customrecord_bsg_eqr_reservation', id: context.request.parameters.rental_id});
			var settings = accountSettings.getSettings();
			var lineCount = rentalRec.getLineCount({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation'});
			var rentalItem = settings.getValue({fieldId:'custrecord_bsg_eqr_settings_item'});
			var curScript = runtime.getCurrentScript();
			var itemCollection = {};

			if(!context.request.parameters.transform){
				var tranSearch = search.create({
					type: 'estimate',
					filters: [
						['custbody_bsg_eqr_reservation_id','is',rentalRec.id],
						'and',
						['mainline','is','T'],
						'and',
						['status','anyof',['Estimate:A']]
					],
					columns: [
						search.createColumn({
							name: 'datecreated',
							sort: search.Sort.DESC
						})
					]
				});
				var res = tranSearch.run().getRange({start:0,end:1});
				if(res.length){
					redirect.toTaskLink({
						id: 'EDIT_TRAN_SALESORD',
						parameters: {
							cf: settings.getValue({fieldId:'custrecord_bsg_settings_eqr_order_form'}),
							rental_id: context.request.parameters.rental_id,
							memdoc:0,
							transform:'estimate',
							id:res[0].id,
							e:'T'
						}
					});
				}
			}

			if(settings.getValue({fieldId:'custrecord_bsg_settings_eqr_order_form'})){
				if(orderRec.getValue({fieldId:'customform'}) != settings.getValue({fieldId:'custrecord_bsg_settings_eqr_order_form'})){
					redirect.toTaskLink({
						id: 'EDIT_TRAN_SALESORD',
						parameters: {
							cf: settings.getValue({fieldId:'custrecord_bsg_settings_eqr_order_form'}),
							rental_id: context.request.parameters.rental_id
						}
					});
				}
			}

			orderRec.setValue({fieldId: 'entity', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_res_customer'})});
			orderRec.setValue({fieldId: 'custbody_bsg_asset_assigned_customer', value:rentalRec.getValue({fieldId:'custrecord_bsg_eqr_ship_to_customer'})});
			orderRec.setValue({fieldId: 'custbody_bsg_eqr_reservation_id', value: rentalRec.id});
			orderRec.setValue({fieldId: 'department', value: curScript.getParameter({name:'custscript_bsg_eqr_so_rental_dept'})}); //RENTALS
			orderRec.setValue({fieldId: 'class', value: curScript.getParameter({name:'custscript_bsg_eqr_so_class'})}); //RENTALS : Forklift
			orderRec.setValue({fieldId: 'location', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_res_loc'})});
			orderRec.setValue({fieldId: 'memo', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_memo'})});

			//Set Bill To and Ship To Address
			orderRec.setValue({fieldId: 'billaddresslist', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_bill_to_address'})});
			orderRec.setValue({fieldId: 'shipaddresslist', value: -2}); //Set To Custom
			orderRec.setValue({fieldId: 'shipaddress', value: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_ship_to_addr_text'})});

			var invSearch = search.create({
				type:'invoice',
				filters: [
					['status','anyof',['CustInvc:A','CustInvc:B','CustInvc:D']],
					'and',
					['custbody_bsg_eqr_reservation_id','is',rentalRec.id]
				],
				columns: [search.createColumn({
					name: 'trandate',
					sort: search.Sort.DESC
				})]
			});
			var invSearchRes = invSearch.run().getRange({start:0,end:1});
			var lastInvDate = null;
			if(invSearchRes.length){
				lastInvDate = moment(invSearchRes[0].getValue({name:'trandate'}));
			}else{
				if(rentalRec.getValue({fieldId:'custrecord_bsg_eqr_last_bill_date'})){
					lastInvDate = moment(rentalRec.getValue({fieldId:'custrecord_bsg_eqr_last_bill_date'}));
				}
			}

			log.debug({title:'Last Bill Date',details:lastInvDate});

			var iOffset = 0;
			var itemColl = {};
			for (var i = 0; i < lineCount; i++){
				var cLine = i - iOffset;
				var itm = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_item', line: i});
				var rentalCategory = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_rental_cat', line: i});
				var qty = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_qty', line: i});
				var rate = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_rate', line: i});
				var description = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_description', line: i});
				var rateCategory = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_rate_cat', line: i});
				var assetCard = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_asset', line: i});
				var startDate = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_start', line: i});
				var endDate = rentalRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_end', line: i});
				var itemClass = null;
				var itemDepartment = null;
				var billPdStart, billPdEnd;
				var addAssetCardRent = false;
				var assetLookup = false;

				//Get The Rental Item From Rental Category
				var rentalItem = settings.getValue({fieldId:'custrecord_bsg_eqr_settings_item'});
				if(rentalCategory){
					var rCatLookup = search.lookupFields({
						type: 'customrecord_bsg_eqr_rental_categories',
						id: rentalCategory,
						columns: ['custrecord_bsg_rental_cat_item']
					});
					if(rCatLookup && rCatLookup.custrecord_bsg_rental_cat_item && rCatLookup.custrecord_bsg_rental_cat_item.length){
						rentalItem = rCatLookup.custrecord_bsg_rental_cat_item[0].value;
					}

					//Get Rental Item Class & Department
					if(!itemCollection[rentalItem]){
						var itemLookup = search.lookupFields({
							type: 'item',
							id: rentalItem,
							columns: ['class','department']
						});
						itemCollection[rentalItem] = itemLookup;
					}
					itemClass = itemCollection[rentalItem].class[0].value;
					itemDepartment = itemCollection[rentalItem].department[0].value;
				}

				//Determine Start of Billing Period
				if(lastInvDate && moment(lastInvDate).isSameOrAfter(moment(startDate))){
					billPdStart = lastInvDate;
				}else{
					billPdStart = startDate;
				}

				//Calculate End of Billing Period
				billPdEnd = moment();
				// var terms = search.lookupFields({
				// 	type: 'customrecord_bsg_subman_term',
				// 	id: rentalRec.getValue({fieldId:'custrecord_bsg_eqr_billing_terms'}),
				// 	columns: ['custrecord_bsg_subman_term_string']
				// });
				// if(terms && terms.custrecord_bsg_subman_term_string){
				// 	// billPdEnd = moment(rentalUtility.calculateEndDateFromTerm(billPdStart, terms.custrecord_bsg_subman_term_string)).subtract(1,'day');
				// 	billPdEnd = moment();
				// }

				//Build Billing Pd
				var billingPd = moment(billPdStart).format('MM/DD/YYYY') + ' - ' + moment(billPdEnd).format('MM/DD/YYYY');

				if(assetCard){
					assetLookup = search.lookupFields({
						type: 'customrecord_bsg_asset_card',
						id: assetCard,
						columns: ['custrecord_bsg_asset_status']
					});
					if(assetLookup && assetLookup.custrecord_bsg_asset_status && assetLookup.custrecord_bsg_asset_status.length){
						if(assetLookup.custrecord_bsg_asset_status[0].value == 23){ //Available For Rent
							addAssetCardRent = true;
						}
					}
				}

				log.debug({title:'Asset Card',details:assetCard});
				log.debug({title:'Asset Card Rent',details:addAssetCardRent});

				log.debug({title:'Start Date',details:startDate});
				log.debug({title:'End Date',details:endDate});
				log.debug({title:'Next Invoice Date',details:rentalRec.getValue({fieldId:'custrecord_bsg_eqr_next_invoice'})});
				log.debug({title:'Last Invoice Date',details:lastInvDate});
				log.debug({title:'SDate Same Or Before Next Invoice Date',details:moment(startDate).isSameOrBefore(moment(rentalRec.getValue({fieldId:'custrecord_bsg_eqr_next_invoice'})))});

				if(moment(startDate).isSameOrBefore(moment())){
					log.debug({title:'IS END DATE AFTER LAST INVOICE',details:'ARE WE BILLING IT?'});
					if(lastInvDate && endDate && moment(endDate).isSameOrBefore(lastInvDate)){
						//The End Date On This Line Is Prior To The Last Invoice Date So Do Not Bill It Again
						log.debug({title:'END BEFORE LAST INVOICE',details:'DONT BILL IT'});
						iOffset++;
						continue;
					}

					log.debug({title:'END DATE AFTER LAST INVOICE',details:'BILLING IT!'});
					log.debug({title:'SETTING ITEMS',details: itm +' - '+rentalItem});

					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'custcol_bsg_rental_category',value:rentalCategory});
					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'item',value:rentalItem});
					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'custcol_bsg_eqr_rental_item',value:itm});
					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'description',value:description});

					log.debug({title:'SET ITEMS',details: itm +' - '+rentalItem});
					if(addAssetCardRent){
						orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'custcol_bsg_asset_card_rent',value:assetCard});
					}
					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'custcol_bsg_asset_card',value:assetCard});

					//Calculate Rates
					//Get Rental Rates
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

					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'quantity',value:rateData.quantity});
					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'price',value:-1});
					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'custcol_bsg_rental_rate_category',value:rateData.rate_category});
					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'rate',value:parseFloat(rateData.rate)});
					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'amount',value:parseFloat(rateData.rate)*parseFloat(rateData.quantity)});
					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'istaxable',value:'T'});

					try{
						orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'department',value:itemDepartment});
						orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'class',value:itemClass});
					}catch(e){
						//Placed In Try/Catch To Avoid Issues With Accounts Which Do Not Have Classification In Line Items
						log.error({title:'ERROR',details:e.message});
					}

					orderRec.setSublistValue({line:cLine, sublistId:'item',fieldId:'custcol_bsg_inv_billing_period',value: billingPd});
					log.debug({title:'SET LINE DATA',details:billingPd});
					log.debug({title:'SET LINE DATA',details:cLine});
					log.debug({title:'SET LINE DATA - Rate',details:rate});
					log.debug({title:'SET LINE DATA - Qty',details:qty});
				}
			}
		}

		return {
			beforeLoad: beforeLoad
		};
	}
);