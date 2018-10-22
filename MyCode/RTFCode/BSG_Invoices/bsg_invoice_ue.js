/**
 * bsg_invoice_ue.js
 * @NApiVersion 2.x
 * @NScriptType UserEventScript
 * @NAmdConfig ./bsg_invoice_config.json
 */
define(['N/record', 'N/search', 'N/runtime', '../BSG_Library_Modules/bsg_module_core.js','moment'],
	function(record, search, runtime, bsgCore, moment){
		function beforeLoad(context){
			var nrec = context.newRecord;
			//Get The Billing Period If This Is A Rental Invoice
			if(nrec.getValue({fieldId:'custbody_bsg_eqr_reservation_id'}) && context.type == 'create'){
				var reservationRec = record.load({
					type: 'customrecord_bsg_eqr_reservation',
					id: nrec.getValue({fieldId:'custbody_bsg_eqr_reservation_id'})
				});
				var invSearch = search.create({
					type:'invoice',
					filters: [
						['status','anyof',['CustInvc:A','CustInvc:B','CustInvc:D']],
						'and',
						['custbody_bsg_eqr_reservation_id','is',reservationRec.id]
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
				}

				var lineCount = nrec.getLineCount({sublistId:'item'})
				log.debug({title:'LINE COUNT',details:lineCount});
				for (var i = 0; i < lineCount; i++){
					var startDate = reservationRec.getSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_start', line: i});
					var billPdStart, billPdEnd;

					//Determine Start of Billing Period
					if(lastInvDate && moment(lastInvDate).isSameOrAfter(moment(startDate))){
						billPdStart = lastInvDate;
					}else{
						billPdStart = startDate;
					}

					//Calculate End of Billing Period
					billPdEnd = moment();
					var terms = search.lookupFields({
						type: 'customrecord_bsg_subman_term',
						id: reservationRec.getValue({fieldId:'custrecord_bsg_eqr_billing_terms'}),
						columns: ['custrecord_bsg_subman_term_string']
					});
					if(terms && terms.custrecord_bsg_subman_term_string){
						billPdEnd = moment(calculateEndDateFromTerm(billPdStart, terms.custrecord_bsg_subman_term_string)).subtract(1,'day');
					}

					log.debug({title: 'BillPDStart', details:billPdStart});
					log.debug({title: 'BillPDEnd', details:billPdEnd});
					//Build Billing Pd
					var billingPd = moment(billPdStart).format('MM/DD/YYYY') + ' - ' + moment(billPdEnd).format('MM/DD/YYYY');
					log.debug({title: 'BillPD', details:billingPd});
					nrec.setSublistValue({sublistId:'item',fieldId:'custcol_bsg_inv_billing_period',value:billingPd,line:i});
				}
			}

			//Build Service Checklist HTML For PDF Template
			var boxChecked = '<td><img src="https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-244132729950/checkbox_checked.png" style="float: left; margin-left: 0px; margin-right: 5px; width: 15px; height: 15px;"/>';
			var boxUnchecked = '<td><img src="https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-244132729950/checkbox_empty.png" style="float: left; margin-left: 0px; margin-right: 5px; width: 15px; height: 15px;"/>';
			var boxXchecked = '<td><img src="https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-244132729950/checkbox_x.png" style="float: left; margin-left: 0px; margin-right: 5px; width: 15px; height: 15px;"/>';

			svcChecklist = nrec.getValue({fieldId:'custbody_bsg_service_order_checklist'});
			if (svcChecklist) {
				try{
					svcChecklist = JSON.parse(svcChecklist);
				}catch(e){
					svcChecklist = {checklist_items:[], checklist_images:[]};
				}
				var serviceChecklistHtml = '';

				if (svcChecklist.checklist_items && svcChecklist.checklist_items.length) {
					serviceChecklistHtml = '<table style="width:100%;border:1px solid black"><tr></tr><tr>';
					for (var i = 0; i < svcChecklist.checklist_items.length; i++) {
						var checked = (svcChecklist.checklist_items[i].checked);
						if (i % 3 === 0 && i > 0) {
							serviceChecklistHtml += '</tr><tr>';
						}

						switch (checked) {
							case true:
								serviceChecklistHtml += boxChecked.replace(/&/g, '&amp;') + ((svcChecklist.checklist_items[i].item).replace(/&/g, 'and')) + '</td>';
								break;
							case null:
							case false:
								if (checked === false) {
									serviceChecklistHtml += boxXchecked.replace(/&/g, '&amp;') + ((svcChecklist.checklist_items[i].item).replace(/&/g, 'and')) + '</td>';
								} else {
									serviceChecklistHtml += boxUnchecked.replace(/&/g, '&amp;') + ((svcChecklist.checklist_items[i].item).replace(/&/g, 'and')) + '</td>';
								}
								break;
							default:
								break;
						}
					}
					serviceChecklistHtml += '</tr></table>';
					nrec.setValue({fieldId:'custbody_bsg_service_checklist_html',value:serviceChecklistHtml});
				}

				// if (svcChecklist.checklist_images && svcChecklist.checklist_images.length) {
				// 	var imagesAdded = [];
				// 	var serviceImageHtml = '<div id="svc_checklist_scrollbox" style="width:100%">';
				// 	for (var i = 0; i < svcChecklist.checklist_images.length; i++) {
				// 		if (svcChecklist.checklist_images[i].asset_image_url) {
				// 			imagesAdded.push(svcChecklist.checklist_images[i].asset_image_id);
				// 			serviceImageHtml += '<div style="position:relative; float:left; margin: 0px 15px 15px 0px" onclick="window.open(\'' + svcChecklist.checklist_images[i].asset_image_url + '\', \'bsgImageWindow\', \'menu=no;\');"><img src="' + svcChecklist.checklist_images[i].asset_image_url + '" style="max-width:200px; height:auto; max-height:250px"/><div style="position:absolute; top:0px; z-index:100; background-color:rgba(0,0,0,.6); color:#fff; font-size:1.2em; padding:4px;">' + svcChecklist.checklist_images[i].image_description + '</div></div>';
				// 		}
				// 	}

				// 	//Get All Images For The Work Order
				// 	var imageSearch = search.create({
				// 		type: 'customrecord_bsg_asset_images',
				// 		filters: [['isinactive','is','F'],'and',['custrecord_bsg_assetimages_service_order','is',nrec.id]],
				// 		columns: ['custrecord_bsg_assetimages_url','custrecord_bsg_assetimages_caption']
				// 	});

				// 	var res = imageSearch.run().getRange({start:0,end:1000});

				// 	for (var i = 0; res && i < res.length; i++) {
				// 		if (res[i].getValue('custrecord_bsg_assetimages_url') && imagesAdded.indexOf(res[i].id) == -1) {
				// 			imagesAdded.push(res[i].id);
				// 			serviceImageHtml += '<div style="position:relative; float:left; margin: 0px 15px 15px 0px" onclick="window.open(\'' + res[i].getValue('custrecord_bsg_assetimages_url') + '\', \'bsgImageWindow\', \'menu=no;\');"><img src="' + res[i].getValue('custrecord_bsg_assetimages_url') + '" style="max-width:200px; height:auto; max-height:250px"/><div style="position:absolute; top:0px; z-index:100; background-color:rgba(0,0,0,.6); color:#fff; font-size:1.2em; padding:4px;">' + res[i].getValue('custrecord_bsg_assetimages_caption') + '</div></div>';
				// 		}
				// 	}

				// 	serviceImageHtml += '</div>';
				// 	nrec.setValue({fieldId:'custbody_bsg_wo_image_html',value:serviceImageHtml});
				// }else{
				// 	nrec.setValue({fieldId:'custbody_bsg_wo_image_html',value:'<div id="svc_checklist_scrollbox" style="width:100%"></div>'});
				// }
			}
		}

		function afterSubmit(context){
			if(context.type == 'delete'){
				return false;
			}
			
			var nrec = context.newRecord;
			var curScript = runtime.getCurrentScript();

			var leaseClass = curScript.getParameter({name:'custscript_bsg_invue_lease_class'});
			var rentalDepartment = curScript.getParameter({name:'custscript_bsg_invue_rental_dept'});
			var salesDepartment = curScript.getParameter({name:'custscript_bsg_invue_sales_dept'});

			var assetValues = {}, curAsset, requiredStatus, i, z, itemLookup, assetCardRes, invDetail;
			var assetCardLineJSON = [];
			var invDetailLineJSON = [];
			var assetColumns = ['custrecord_bsg_asset_status','custrecord_bsg_asset_type','custrecord_bsg_asset_side_shift','custrecord_bsg_asset_serial',
				'custrecord_bsg_asset_lbr','custrecord_bsg_asset_4th_valve','custrecord_bsg_asset_mast_height','custrecord_bsg_asset_lift_height',
				'custrecord_bsg_asset_capacity','custrecord_bsg_asset_fork_size','custrecord_bsg_asset_drive_tire_type','custrecord_bsg_asset_steer_tire_type',
				'custrecord_bsg_asset_non_marking','custrecord_bsg_asset_voltage','custrecord_bsg_asset_connector_type','custrecord_bsg_asset_item_make',
				'custrecord_bsg_asset_equipment_subclass','name','custrecord_bsg_asset_built_in_charger','custrecord_bsg_asset_watering_system','custrecord_bsg_asset_hour_meter_reading'
			];
			var soRec = false;
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
						log.debug({'title':'HAS INV DETAIL',details:'HAS INV DETAIl'});
						if(invDetail){
							var curInvDetailJSON = [];
							assetCardRes = bsgCore.getAssetCardsFromInventoryDetail(invDetail,'issueinventorynumber');
							for(z = 0; z < assetCardRes.length; z++){
								assetValues = {};
								var assetDetail = search.lookupFields({
									type: 'customrecord_bsg_asset_card',
									id: assetCardRes[z].id,
									columns: assetColumns
								});
								assetValues.custrecord_bsg_asset_assigned_customer = nrec.getValue('entity');
								assetValues.custrecord_bsg_asset_status = 14;
								//Load SO To Get Ship To Address
								if(nrec.getValue({fieldId:'createdfrom'})){
									if(!soRec){
										soRec = record.load({
											type:'salesorder',
											id: nrec.getValue({fieldId:'createdfrom'})
										});
									}
									var shipAddress = soRec.getValue({fieldId:'shipaddresslist'});
									if(shipAddress){
										assetValues.custrecord_bsg_asset_location_address = shipAddress;
									}
								}
								record.submitFields({
									type: 'customrecord_bsg_asset_card',
									id: assetCardRes[z].id,
									values: assetValues
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
						assetValues = {};
						var assetStatus = 23; //Default to Available For Rent
						switch(parseInt(nrec.getValue({fieldId:'department'}))){
							case salesDepartment: //Sales
								assetStatus = 14; //Sold
								assetValues.custrecord_bsg_asset_billing_customer = nrec.getValue('entity');
								break;
							case rentalDepartment: //Rentals
								assetStatus = 13; //Rented
								break;
						}
						if (parseInt(nrec.getValue({fieldId:'class'})) == leaseClass){
							assetStatus = 25; //Customer Leased
						}

						var assetDetail = search.lookupFields({
							type: 'customrecord_bsg_asset_card',
							id: curAsset,
							columns: assetColumns
						});
						assetCardLineJSON.push(assetDetail);

						if (assetDetail && assetDetail.custrecord_bsg_asset_status && assetDetail.custrecord_bsg_asset_status.length){
							assetValues.custrecord_bsg_asset_assigned_customer = nrec.getValue('entity');
							assetValues.custrecord_bsg_asset_status = assetStatus;
							// log.debug({title:'AssetDetail',details:assetDetail});
							//Load SO To Get Ship To Address
							if(nrec.getValue({fieldId:'createdfrom'})){
								if(!soRec){
									soRec = record.load({
										type:'salesorder',
										id: nrec.getValue({fieldId:'createdfrom'})
									});
								}
								var shipAddress = soRec.getValue({fieldId:'shipaddresslist'});
								if(shipAddress){
									assetValues.custrecord_bsg_asset_location_address = shipAddress;
								}
							}
							if (parseInt(nrec.getValue({fieldId:'class'})) == leaseClass){
								//Only Update If A Lease
								record.submitFields({
									type: 'customrecord_bsg_asset_card',
									id: curAsset,
									values: assetValues
								});
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
			
			//if this is internal billing create  a credit memo
			var invInternal =parseInt(nrec.getValue({fieldId:'entity'}));
		  log.debug('invoice status ', nrec.getValue({fieldId:'status'}));
	      //internalBill= returnEntityMatch(invInternal		
		  if (returnEntityMatch(invInternal) && nrec.getValue({fieldId: 'status'})=='Open'){
			//create a new Credit memo from this invoice
		    //set the Cm sales rep to null and save 
	          log.debug('created CM for ', nrec.id)
			  var objRecord = record.transform({
	        	   fromType: record.Type.INVOICE,
	        	   fromId: nrec.id,
	        	   toType: record.Type.CREDIT_MEMO,
	        	   isDynamic: true,
	           	
	           });
	           objRecord.setValue({
	        	   fieldId: 'salesrep',
	        	   value : null});
	               objRecord.save();	
			}
			
				
		}
		//rf function to determine if internal billing
		function returnEntityMatch(entityID) {

		    var JSONEntity = parseInt((0), 10);
		    var retObj = [];
		    var rentalLocJSON = [];
		    var actSetting = record.load({
		    	type : 'customrecord_bsg_account_settings',
		    	id : 1
		    });
		    var nrec = 
		    rentalLocJSON = actSetting.getValue({fieldId: 'custrecord_bsg_rented_location_data'});
		    log.debug('what is the entity passed ', entityID);
		    log.debug('what is the JSON on the account setting ', rentalLocJSON);
            var isInternal = false;
		    if (!(rentalLocJSON instanceof Array)) {
		             rentalLocJSON = JSON.parse(rentalLocJSON);
		    }

		    //Here loop through the JSON for the location id 
		    for (var i = 0; i < rentalLocJSON.length; i++) {

		        if (rentalLocJSON[i].customer_ref == entityID) {
		            //the location was found set th JSONEntity to the rented_location 
		        	isInternal=true;
		          	break;
		        }
               
		    }

		    return isInternal;
		}
		
		
		
		
		function calculateEndDateFromTerm(startDate, term) {
			var curUser = runtime.getCurrentUser();
			var dateFormat = curUser.getPreference({name: 'DATEFORMAT'});
			var _termMap = {
				'h': 'hours',
				'd': 'days',
				'w': 'weeks',
				'm': 'months',
				'y': 'years'
			};
			var cleanTerm = term.replace(/\s/g, '');
			var ints = cleanTerm.match(/\d+/g);
			var termLetters = cleanTerm.match(/[a-zA-Z]/g);
			var endDate = moment(startDate, dateFormat);
			if (ints.length < termLetters.length) {
				//Something is wrong with the term string
				return false;
			}

			for (var i = 0; termLetters && i < termLetters.length; i++) {
				endDate = endDate.add(parseInt(ints[i]), _termMap[termLetters[i].toLowerCase()]);
			}

			return endDate.toDate();
		}
		return{
			beforeLoad: beforeLoad,
			afterSubmit: afterSubmit
		};
	}
);