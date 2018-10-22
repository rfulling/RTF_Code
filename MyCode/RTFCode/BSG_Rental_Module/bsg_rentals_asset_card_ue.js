/**
 * bsg_rentals_asset_card_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 */
define(['N/record', 'N/search', 'N/url', './bsg_module_rental_utility'],
	function(record, search, url, rentalUtility) {
		function beforeLoad(context){
			var rec = context.newRecord;
			var form = context.form;

			//Create Rental Pricing Sublist
			var rateTypes = rentalUtility.getRateTypes();
			log.debug({title:'Rate Types',details:rateTypes});
			var curDomain = url.resolveDomain({hostType: url.HostType.APPLICATION});
			var tab = 'custom52';
          
			var rentalRateSublist = form.addSublist({
				id: 'custpage_bsg_equip_rental_rate_list',
				label: 'Rental Rate List',
				type: 'inlineeditor',
				tab: tab
			});
			form.insertSublist({
				sublist: 'custpage_bsg_equip_rental_rate_list',
				nextsublist: 'customsublist14'
			});

			var rateNameField = rentalRateSublist.addField({
				id: 'custpage_bsg_equip_rental_rate_name',
				label: 'Rate Name',
				type: 'text'
			});
			var rateAmountField = rentalRateSublist.addField({
				id: 'custpage_bsg_equip_rental_rate',
				label: 'Amount',
				type: 'currency'
			});
			rateNameField.updateDisplayType({displayType:'disabled'});

			var rateData = rec.getValue({fieldId:'custrecord_bsg_asset_rental_rate_data'});
			if(rateData){
				log.debug({title:'Rate Data',details:rateData});
				rateData = JSON.parse(rateData);
			}

			for(var i = 0; rateTypes && i < rateTypes.length; i++){
				rentalRateSublist.setSublistValue({
					id: 'custpage_bsg_equip_rental_rate_name',
					line: i,
					value: rateTypes[i]
				});
				if (rateData && rateData[rateTypes[i]]){
					rentalRateSublist.setSublistValue({
						id: 'custpage_bsg_equip_rental_rate',
						line: i,
						value: rateData[rateTypes[i]]
					});
				}
			}
		}
  
  /**
     * Function definition to be triggered before record is loaded.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.newRecord - New record
     * @param {Record} scriptContext.oldRecord - Old record
     * @param {string} scriptContext.type - Trigger type
     * @Since 2015.2
     */
    function afterSubmit(scriptContext) {
    	if (scriptContext.type !== scriptContext.UserEventType.CREATE){
    		return false;
    	}
    	//check for rental rates for this item 
    	var nrec =scriptContext.newRecord;
    	var itemId = parseInt(nrec.getValue({fieldId: 'custrecord_bsg_asset_item'}));
       // var assetType = nrec.getText({fieldId: 'custrecord_bsg_asset_type'});
        
    	//search for rental rates 
        log.debug('looking for item , ' ,itemId);
    	
		        var rentalRateSearch = search.create({
		 			type: 'customrecord_bsg_rental_item_rates',
		 			filters:[
		 		
		 					['custrecord_bsg_rental_item_rates_item','anyof', itemId]
		 					],
		 			columns:['custrecord_bsg_rental_item_rates_rate',
		                       'custrecord_bsg_rental_item_rates_cat'
		                      
		 				    ]
		 		});
		        
		       
		        
		        var arrRates = rentalRateSearch.run().getRange({start: 0,end: 10});
		    log.debug('arrRates ',arrRates );
		  if(arrRates){
		       var rentalRateCat = arrRates[0].getValue('custrecord_bsg_rental_item_rates_cat') ;
		        var rentalRate =    arrRates[0].getValue('custrecord_bsg_rental_item_rates_rate');
    	}
		   
    	log.debug('rate ',rentalRate);
    	log.debug('category ',rentalRateCat);
    	log.debug('assetId  ',nrec.id);
    	
    	
    	//var update the rental Rates by createing a new record 
    	
     var assetRentalRate =  record.create({
    		type: 'customrecord_bsg_rental_asset_rates',
    		 isDynamic: true
    	});
     
     assetRentalRate.setValue({fieldId:'custrecord_bsg_rental_asset_rates_cat',value: rentalRateCat});
     assetRentalRate.setValue({fieldId:'custrecord_bsg_rental_asset_rates_rate',value: rentalRate});
     assetRentalRate.setValue({fieldId:'custrecord_bsg_rental_asset_rates_asset',value: nrec.id});
      assetRentalRate.save();
     
    }
		return {
			//beforeLoad: beforeLoad,
			afterSubmit: afterSubmit
		};
	}
);