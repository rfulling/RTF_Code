/**
 * bsg_workorder_ue.js
 * @NApiVersion 2.x
 * @NScriptType usereventscript
 * @NAmdConfig ./bsg_workorder_config.json
*/
define(['N/record', 'N/ui/serverWidget', 'N/runtime', 'N/search', 'addressLib', './bsg_workorder_ue_utility.js', '../BSG_Library_Modules/moment-timezone.min'],
	function(record, serverWidget, runtime, search, addressLib, workOrderUtility, moment){
		function beforeLoad(context){
			var rec = context.newRecord;
			var form = context.form;
			var curScript = runtime.getCurrentScript();
			if (context.type === context.UserEventType.VIEW) {
				context.form.clientScriptModulePath = './bsg_workorder_utility.js';
				
				if (rec.getText({fieldId:'custbody_bsg_work_order_equip_category'}) == 'Asset Card' || !rec.getText({fieldId:'custbody_bsg_work_order_equip_category'})) {
					var hptField = context.form.getField({id:'custbody_bsg_hpt_serial'});
					hptField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN});
				} else {
					var assetCardField = context.form.getField({id:'custbody_bsg_asset_card'});
					var assetStatusField = context.form.getField({id:'custbody_asset_status'});
					var assetMakeField = context.form.getField({id:'custbody_bsg_asset_make'});
					var assetModelField = context.form.getField({id:'custbody_bsg_asset_model'});
					var assetSerialField = context.form.getField({id:'custbody_bsg_asset_serial'});
					var assetYearField = context.form.getField({id:'custbody_bsg_asset_year'});
					var assetHourField = context.form.getField({id:'custbody_bsg_asset_hour_meter'});

					assetCardField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN});
					assetStatusField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN});
					assetMakeField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN});
					assetModelField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN});
					assetSerialField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN});
					assetYearField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN});
					assetHourField.updateDisplayType({displayType:serverWidget.FieldDisplayType.HIDDEN});
				}
			}

			//HANDLE URL PARAMETER IF CREATE
			try{
				if (context.type == 'create' && context.request && context.request.parameters && runtime.executionContext == 'USERINTERFACE') {
					for(var param in context.request.parameters){
						try{
							if(['memdoc','transform','id','e','whence'].indexOf(param) == -1){
								rec.setValue({fieldId:param, value:context.request.parameters[param]});
							}
						}catch(e){
							//Error Setting Value
							log.error({title:'ERROR Setting URL Parameter',details:e.message});
						}
					}
				}
			}catch(e){
				//Putting in Try/Catch as it is throwing a fatal error when a record is created by another script
			}

          
			//Handle Custom Shipping Address For Service Orders
			if(rec.getValue({fieldId:'customform'}) == curScript.getParameter({name:'custscript_bsg_wo_ue_workorder_form'})){
				if(context.type != 'view'){
					// var shipToSelect = form.getField({id:'custrecord_bsg_eqr_ship_to_address'});
					var shipToAddress = form.addField({
						type: 'select',
						id: 'custpage_ship_to_address',
						label: 'Service Address'
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
						rec.setValue({fieldId:'shipaddress',value:' '});
					}

					if(!rec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})){
						rec.setValue({fieldId:'custbody_bsg_asset_assigned_customer',value:rec.getValue({fieldId:'entity'})});
					}

					if(rec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})){
						if(context.type == 'create'){
							//Get Customer Default Shipping Address
							var defaultShippingAddress = addressLib.getDefaultShippingAddress({customerRecordId:rec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})});
							rec.setValue({fieldId:'custbody_bsg_custom_ship_to_address',value:defaultShippingAddress.value});
							if(defaultShippingAddress){
								log.debug({title:'DEFAULT SHIPPING ADDRESS!',details:defaultShippingAddress});
								rec.setValue({
									fieldId:'shipaddress',
									value: defaultShippingAddress.text
								});
							}
						}
						shipToAddress = addressLib.populateAddressBook({
							customerRecordId: rec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
							scriptType: 'UserEventScript',
							defaultValue: rec.getValue({fieldId:'custbody_bsg_custom_ship_to_address'}),
							field: shipToAddress
						});
					}else{

					}
				}
			}

			//Create Service Checklist Select

			//Build Service Checklist HTML
			var boxChecked = '<td><img src="https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-244132729950/checkbox_checked.png" style="float: left; margin-left: 0px; margin-right: 5px; width: 15px; height: 15px;"/>';
			var boxUnchecked = '<td><img src="https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-244132729950/checkbox_empty.png" style="float: left; margin-left: 0px; margin-right: 5px; width: 15px; height: 15px;"/>';
			var boxXchecked = '<td><img src="https://s3-us-west-2.amazonaws.com/elasticbeanstalk-us-west-2-244132729950/checkbox_x.png" style="float: left; margin-left: 0px; margin-right: 5px; width: 15px; height: 15px;"/>';

			svcChecklist = rec.getValue({fieldId:'custbody_bsg_service_order_checklist'});
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
					rec.setValue({fieldId:'custbody_bsg_service_checklist_html',value:serviceChecklistHtml});
				}

				if (svcChecklist.checklist_images && svcChecklist.checklist_images.length) {
					var imagesAdded = [];
					var serviceImageHtml = '<div id="svc_checklist_scrollbox" style="width:100%">';
					for (var i = 0; i < svcChecklist.checklist_images.length; i++) {
						if (svcChecklist.checklist_images[i].asset_image_url) {
							imagesAdded.push(svcChecklist.checklist_images[i].asset_image_id);
							serviceImageHtml += '<div style="position:relative; float:left; margin: 0px 15px 15px 0px" onclick="window.open(\'' + svcChecklist.checklist_images[i].asset_image_url + '\', \'bsgImageWindow\', \'menu=no;\');"><img src="' + svcChecklist.checklist_images[i].asset_image_url + '" style="max-width:200px; height:auto; max-height:250px"/><div style="position:absolute; top:0px; z-index:100; background-color:rgba(0,0,0,.6); color:#fff; font-size:1.2em; padding:4px;">' + svcChecklist.checklist_images[i].image_description + '</div></div>';
						}
					}

					if(rec.id){
						//Get All Images For The Work Order
						var imageSearch = search.create({
							type: 'customrecord_bsg_asset_images',
							filters: [['isinactive','is','F'],'and',['custrecord_bsg_assetimages_service_order','is',rec.id]],
							columns: ['custrecord_bsg_assetimages_url','custrecord_bsg_assetimages_caption']
						});

						var res = imageSearch.run().getRange({start:0,end:1000});

						for (var i = 0; res && i < res.length; i++) {
							if (res[i].getValue('custrecord_bsg_assetimages_url') && imagesAdded.indexOf(res[i].id) == -1) {
								imagesAdded.push(res[i].id);
								serviceImageHtml += '<div style="position:relative; float:left; margin: 0px 15px 15px 0px" onclick="window.open(\'' + res[i].getValue('custrecord_bsg_assetimages_url') + '\', \'bsgImageWindow\', \'menu=no;\');"><img src="' + res[i].getValue('custrecord_bsg_assetimages_url') + '" style="max-width:200px; height:auto; max-height:250px"/><div style="position:absolute; top:0px; z-index:100; background-color:rgba(0,0,0,.6); color:#fff; font-size:1.2em; padding:4px;">' + res[i].getValue('custrecord_bsg_assetimages_caption') + '</div></div>';
							}
						}
					}

					serviceImageHtml += '</div>';
					rec.setValue({fieldId:'custbody_bsg_wo_image_html',value:serviceImageHtml});
				}else{
					rec.setValue({fieldId:'custbody_bsg_wo_image_html',value:'<div id="svc_checklist_scrollbox" style="width:100%"></div>'});
				}
			}else{
				rec.setValue({fieldId:'custbody_bsg_service_order_checklist',value:'{checklist_images:[],checklist_items:[]}'});
				rec.setValue({fieldId:'custbody_bsg_service_checklist_html',value:'<table style="width:75%;border:1px solid black"></table>'});
			}
		}
		function beforeSubmit(context){
			var nrec = context.newRecord;
			try{
				if (context.type != 'create' && context.type != 'copy'){
					var orec = context.oldRecord;
					if (runtime.executionContext === runtime.ContextType.USER_INTERFACE){
						if (nrec.getValue({fieldId:'custbody_bsg_work_order_status'}) != orec.getValue({fieldId:'custbody_bsg_work_order_status'})){
							var woStatusUpdate = nrec.getValue({fieldId:'custbody_bsg_wo_status_updates'});
							var assignedTech = nrec.getValue({
							    fieldId: 'custbody_bsg_assigned_tech'
							});
							var curStatus = nrec.getValue({
							    fieldId: 'custbody_bsg_work_order_status'
							});
							var tlog = {
								custcol_bsg_time_wo_status: curStatus,
								date_time: new Date(),
								employee: assignedTech
							};
							if (woStatusUpdate){
								woStatusUpdate = JSON.parse(woStatusUpdate);
								woStatusUpdate.push(tlog);
							}else{
								woStatusUpdate = [tlog];
							}
							nrec.setValue({
							    fieldId: 'custbody_bsg_wo_status_updates',
							    value: JSON.stringify(woStatusUpdate)
							});
						}
					}
				}
			}catch(e){
				//No context.oldRecord
				log.error({title:'NO OLD RECORD',details:'No context.oldRecord'});
			}

			try{
				log.debug({title:'custpage_ship_to_address',details:nrec.getValue({fieldId:'custpage_ship_to_address'})});
				if(nrec.getValue({fieldId:'custpage_ship_to_address'})){
					nrec.setValue({fieldId:'custbody_bsg_custom_ship_to_address',value:nrec.getValue({fieldId:'custpage_ship_to_address'})});
				}
			}catch(e){
				//May Not Have custpage_ship_to_address Field If Not A Work Order
				log.error({title:'NO CUSTOM SHIP ADDRESS FIELD',details:'NO SHIP ADDRESS FIELD'});
			}

			//Grab JSON For Service Checklist If It Wasn't Pulling In Properly
			if(nrec.getValue({fieldId:'custbody_bsg_service_checklist'})){
				var curJson = nrec.getValue({fieldId:'custbody_bsg_service_order_checklist'});
				try{
					curJson = JSON.parse(curJson);
				}catch(e){
					curJson = {checklist_images:[],checklist_items:[]};
				}

				if(!curJson.checklist_images.length){
					var scRec = search.lookupFields({
						type: 'customrecord_bsg_service_checklists',
						id: nrec.getValue({fieldId:'custbody_bsg_service_checklist'}),
						columns: 'custrecord_bsg_sc_json'
					});
					nrec.setValue({fieldId:'custbody_bsg_service_order_checklist',value:scRec.custrecord_bsg_sc_json});
				}
			}
		}

		function afterSubmit(context){
			if(context.type == 'delete'){
				return;
			}
			log.debug({title:'IN AFTER SUBMIT',details:'SUBMITTING'});
			var rec = context.newRecord;
			var orec;

			try{
				orec = context.oldRecord;
			}catch(e){
				log.error({title:'NO OLD RECORD',details:'No old record'});
			}

			//Update Lat/Long
			if(rec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})){
				var selectedServiceAddress = rec.getValue({fieldId:'custbody_bsg_custom_ship_to_address'});
				if(selectedServiceAddress){
					var custRec = JSON.parse(JSON.stringify(record.load({type:'customer',id:rec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'})})));
					log.debug({title:'custrec',details:custRec});
					var addrBook = custRec.sublists.addressbook;
					for(var addr in addrBook){
						if(addr == 'currentline'){
							continue;
						}
						if(addrBook[addr].id == selectedServiceAddress){
							log.debug({title:'addr',details:addrBook[addr]});
							log.debug({title:'addressbookaddress',details:addrBook[addr].addressbookaddress_key});
							var addrSearch = search.create({
								type: 'address',
								filters: [['internalid','is',addrBook[addr].addressbookaddress_key]],
								columns: ['custrecord_bsg_address_lat','custrecord_bsg_address_long']
							});
							var addrRes = addrSearch.run().getRange({start:0,end:1});
							if(addrRes.length){
								record.submitFields({
									type: 'salesorder',
									id: rec.id,
									values: {
										custbody_bsg_wo_service_addr_geocode: addrRes[0].getValue({name:'custrecord_bsg_address_lat'}) + ',' + addrRes[0].getValue({name:'custrecord_bsg_address_long'})
									}
								});
							}
						}
					}
				}
			}

			var valObj = {};
			var updateAssetCard = false;
			try{
				if(context.type == 'create'){
					if(rec.getValue({fieldId:'custbody_bsg_work_order_type'})){
						//Make Flow Status = 05 Tech Assigned when not complete
						valObj.custrecord_bsg_flow_status= 5;

						//Update Asset Card Record
						updateAssetCard = true;
					}
				}
				if(orec){
					//Update Preferred Tech On Customer
					if(rec.getValue({fieldId:'custbody_bsg_assigned_tech'})){
						var custData = search.lookupFields({
							type:'customer',
							id: rec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
							columns: ['custentity_bsg_preferred_tech']
						});
						if(!custData.custentity_bsg_preferred_tech.length){
							record.submitFields({
								type:'customer',
								id: rec.getValue({fieldId:'custbody_bsg_asset_assigned_customer'}),
								values: {
									custentity_bsg_preferred_tech: rec.getValue({fieldId:'custbody_bsg_assigned_tech'})
								}
							});
						}
					}

					//Handle Work Order Specific Logic
					if (rec.getValue({fieldId:'custbody_bsg_work_order_type'})){
						workOrderUtility.updateTimeLog(context);
						if (!orec.getValue({fieldId:'custbody_bsg_work_order_status'}) || orec.getValue({fieldId:'custbody_bsg_work_order_status'}) != 8){ //Is Not Complete
							log.debug({title:'OREC OTYPE',details:orec.getText({fieldId:'custbody_bsg_work_order_type'})});

							if(rec.getValue({fieldId:'custbody_bsg_work_order_status'}) && (rec.getValue({fieldId:'custbody_bsg_work_order_status'}) != 8) && (rec.getValue({fieldId:'custbody_bsg_work_order_status'}) != orec.getValue({fieldId:'custbody_bsg_work_order_status'}))){
								//Make Flow Status = 05 Tech Assigned when not complete
								valObj.custrecord_bsg_flow_status= 5;

								//Update Asset Card Record
								updateAssetCard = true;
							}

							if(rec.getValue({fieldId:'custbody_bsg_work_order_status'}) == 8){
								if (rec.getValue({fieldId:'custbody_bsg_asset_card'})){
									//Determine If This Is Planned Maintenance To Schedule Next PM
									if(rec.getText({fieldId:'custbody_bsg_work_order_type'}) == 'CF PM / Planned Maintenance (Service)'){
										log.debug({title:'Scheduling Next PM',details:'TRUE'});
										var frequency = search.lookupFields({
											type: 'customrecord_bsg_asset_card',
											id: rec.getValue({fieldId:'custbody_bsg_asset_card'}),
											columns: ['custrecord_bsg_asset_service_frequency']
										});
										log.debug({title:'frequency',details:frequency});
										if (frequency.custrecord_bsg_asset_service_frequency){
											//Schedule Next PM
											var nextPMDate = calculateDateFromTerm(rec.getValue({fieldId:'startdate'}), (frequency.custrecord_bsg_asset_service_frequency + 'm'));
											if (nextPMDate){
												nextPMDate = moment(nextPMDate).format('M/DD/YYYY');
												var lastPm = moment(rec.getValue({fieldId:'startdate'})).format('M/DD/YYYY');
												valObj.custrecord_bsg_asset_next_service = nextPMDate;
												valObj.custrecord_bsg_asset_last_service = lastPm;
											}
										}
									}

									//Set Last Tech On Asset Card
									valObj.custrecord_bsg_asset_preferred_tech = rec.getValue({fieldId:'custbody_bsg_assigned_tech'});

									if(rec.getText({fieldId:'custbody_asset_status'}) != 'Rented'){ //this needs to be updated Pointing to the Internal ID not the Text
										//Make Flow Status = 14 Ready & Complete when complete
										valObj.custrecord_bsg_flow_status= 14;
									}else{
										valObj.custrecord_bsg_flow_status= null;
									}

									//Update Asset Card Record
									updateAssetCard = true;
								}
							}
						}
					}
				}
				if(updateAssetCard){
					record.submitFields({
						type: 'customrecord_bsg_asset_card',
						id: rec.getValue({fieldId:'custbody_bsg_asset_card'}),
						values: valObj
					});
				}
			}catch(e){
				log.error({title:'AFTER SUBMIT ERROR',details:e.message});
			}
		}
		function calculateDateFromTerm(startDate, termString){
			var curUser = runtime.getCurrentUser();
			var dateFormat = curUser.getPreference({name: 'DATEFORMAT'});
			var _termMap = {
				'h':'hours',
				'd':'days',
				'w':'weeks',
				'm':'months',
				'y':'years'
			};
			var cleanTerm = termString.replace(/\s/g,'');
			var ints = cleanTerm.match(/\d+/g);
			var termLetters = cleanTerm.match(/[a-zA-Z]/g);
			var endDate = moment(startDate, dateFormat);
			if(termLetters){
				if(ints.length < termLetters.length){
					return false;
				}
			}
			if(!termLetters || termLetters.length < 1){
				termLetters.push('m');
			}
			for (var i = 0; termLetters && i < termLetters.length; i++){
				endDate = endDate.add(parseInt(ints[i]), _termMap[termLetters[i].toLowerCase()]);
			}

			return endDate.subtract(1,'day').toDate();
		}
		return{
			beforeLoad: beforeLoad,
			beforeSubmit: beforeSubmit,
			afterSubmit: afterSubmit
		};
	}
);