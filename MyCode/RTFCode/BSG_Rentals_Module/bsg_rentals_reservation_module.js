/**
 * bsg_rentals_reservation_module.js
 * @NApiVersion 2.x
 * @NModuleScope public
 * @NAmdConfig ./bsg_rental_module_config.json
 */

define(['N/currentRecord', 'N/https', 'N/url', 'N/format', 'N/runtime', 'N/record', 'N/search', 'moment', 'accountSettings', 'jquery', 'jqueryui'],
	function(currentRecord, https, url, format, runtime, record, search, moment, accountSettings, jQuery) {
		var equipmentAvailabilityModal = jQuery("#eqAvailModal").dialog({
			autoOpen: false,
			height: 400,
			width: 600,
			modal: true,
			draggable: false,
			buttons: {
				Submit: function() {
					var curRec = currentRecord.get();
					curRec.setCurrentSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_asset',value:jQuery('input[name="hw_avail"]:checked').val()});
					curRec.setCurrentSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_start',value: new Date()});
					equipmentAvailabilityModal.dialog("close");
				},
				Cancel: function() {
					equipmentAvailabilityModal.dialog("close");
				}
			},
			close: function() {
				console.log('CLOSING DIALOG!');
			},
			open: function(event, ui) {
				setTimeout(function() {
					jQuery(".ui-dialog").css({
						"top": (jQuery(window).scrollTop()) + (jQuery(window).height() - jQuery(".ui-dialog").height() - 200) / 2,
						"left": (jQuery(window).width() - jQuery(".ui-dialog").width()) / 2
					});
				}, 50);
			}
		});
		function searchAvailableEquipment(){
			jQuery("body").css("cursor", "progress");
			window.hardwareRateData = window.hardwareRateData || {};
			window.nonSerializedRateData = window.nonSerializedRateData || {};
			setTimeout(function(){
				var i;
				var curUser = runtime.getCurrentUser();
				var dateFormat = curUser.getPreference({name: 'DATEFORMAT'});
				var rec = currentRecord.get();
				var eqItem = rec.getCurrentSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation', fieldId:'custrecord_bsg_eqr_resline_item'});
				var eqLoc = rec.getValue({fieldId:'custrecord_bsg_eqr_res_loc'});
				var resStart = rec.getValue({fieldId:'custrecord_bsg_eqr_res_start'});
				var resEnd = rec.getValue({fieldId:'custrecord_bsg_eqr_res_end'});
				var hardwareRes = [], nonSerializedRes = [];
				if (!eqItem){
					alert('Please Select An Equipment Type!');
					jQuery("body").css("cursor", "default");
					return false;
				} else if(!eqLoc){
					alert('Please Select The Location For The Reservation!');
					jQuery("body").css("cursor", "default");
					return false;
				} else if(!resStart){
					alert('Please Provide The Start Date For The Reservation!');
					jQuery("body").css("cursor", "default");
					return false;
				}

				var itemSearch = search.lookupFields({
					type: 'inventoryitem',
					id: eqItem,
					columns: ['usebins','isserialitem']
				});

				if (itemSearch.isserialitem){
					var filters = [
						['isinactive','is','F'],
						'and',
						['custrecord_bsg_asset_status','is',23], //Available For Rent
						'and',
						['custrecord_bsg_asset_item','is',eqItem]
					];

					var hardwareSearch = search.create({
						type: 'customrecord_bsg_asset_card',
						filters: filters,
						columns:[
							'name','custrecord_bsg_asset_rental_rate_data'
						]
					});
					var hardwareRes = hardwareSearch.run().getRange({start:0,end:1000});
					console.log('ASSET RES',JSON.parse(JSON.stringify(hardwareRes)));
				}else{
					var invSearch = search.create({
						type: 'inventoryitem',
						filters: [
							['internalid','is',eqItem],
							'and',
							['inventorylocation','is',rec.getValue({fieldId:'custrecord_bsg_eqr_res_loc'})],
							'and',
							['locationquantityonhand','greaterthan',0]
						],
						columns: ['custitem_bsg_rental_rate_data','locationquantityonhand']
					});
					nonSerializedRes = invSearch.run().getRange({start:0, end:100});
					console.log('Non Serialized Res',JSON.parse(JSON.stringify(nonSerializedRes)));
				}

				var reservationSearch = search.create({
					type: 'customrecord_bsg_eqr_reservation_line',
					filters: [
						['isinactive','is','F'],
						'and',
						['custrecord_bsg_eqr_resline_item','is',eqItem],
						'and',
						['custrecord_bsg_eqr_resline_reservation.custrecord_bsg_eqr_res_status','is',3], //IN PROGRESS
						'and',
						['custrecord_bsg_eqr_resline_reservation.custrecord_bsg_eqr_res_end','onorbefore',moment(resStart).format(dateFormat)]
					],
					columns: ['custrecord_bsg_eqr_resline_item','custrecord_bsg_eqr_resline_asset','custrecord_bsg_eqr_resline_asset.custrecord_bsg_asset_rental_rate_data','custrecord_bsg_eqr_resline_asset.name','custrecord_bsg_eqr_resline_qty']
				});
				var reservationRes = reservationSearch.run().getRange({start:0,end:1000});
				console.log('RESERVATION RES',JSON.parse(JSON.stringify(reservationRes)));

				var thead = '<thead>';

				if (itemSearch.isserialitem){
					thead += '<tr>'+
						'<th style="border: 1px solid black; padding:2px">Select</th>'+
						'<th style="border: 1px solid black; padding:2px">Serial</th>';
				}else{
					thead += '<tr>'+
						'<th style="border: 1px solid black; padding:2px">Quantity Available</th>';
				}

				var rateHeaders = [];
				var rateHeadRef = [];
				var curRates, rt, rate;

				if (itemSearch.isserialitem){
					for (i = 0; hardwareRes && i < hardwareRes.length; i++){
						curRates = hardwareRes[i].getValue({name:'custrecord_bsg_asset_rental_rate_data'});
						window.hardwareRateData[hardwareRes[i].id] = curRates;
						if (curRates){
							curRates = JSON.parse(curRates);
							for(rate in curRates){
								rt = rate.replace(/ /g,'_');
								if (rateHeadRef.indexOf(rt) == -1){
									rateHeaders.push(rate);
									rateHeadRef.push(rt);
								}
							}
						}
					}
					console.log('Passed Hardware');
					for (i = 0; reservationRes && i < reservationRes.length; i++){
						curRates = reservationRes[i].getValue({name:'custrecord_bsg_eqr_resline_asset.custrecord_bsg_asset_rental_rate_data'});
						window.hardwareRateData[reservationRes[i].getValue({name:'custrecord_bsg_eqr_resline_asset'})] = curRates;
						if (curRates){
							curRates = JSON.parse(curRates);
							for(rate in curRates){
								rt = rate.replace(/ /g,'_');
								if (rateHeadRef.indexOf(rt) == -1){
									rateHeaders.push(rate);
									rateHeadRef.push(rt);
								}
							}
						}
					}
				}else{
					console.log('NON SERIALIZED RES LENGTH',nonSerializedRes.length);
					for (i = 0; nonSerializedRes && i < nonSerializedRes.length; i++){
						curRates = nonSerializedRes[i].getValue({name:'custitem_bsg_rental_rate_data'});
						window.nonSerializedRateData[nonSerializedRes[i].id] = curRates;
						if (curRates){
							curRates = JSON.parse(curRates);
							for(rate in curRates){
								rt = rate.replace(/ /g,'_');
								if (rateHeadRef.indexOf(rt) == -1){
									rateHeaders.push(rate);
									rateHeadRef.push(rt);
								}
							}
						}
					}
				}

				for (i = 0; i < rateHeaders.length; i++){
					thead += '<th style="border: 1px solid black; padding:2px">'+rateHeaders[i]+'</th>';
				}

				thead += '</tr></thead>';

				var reservationCount = (reservationRes) ? reservationRes.length : 0;
				var hardwareCount = (hardwareRes) ? hardwareRes.length : 0;
				var nonSerializedCount = (nonSerializedRes && nonSerializedRes.length) ? nonSerializedRes[0].getValue({name:'locationquantityonhand'}) : 0;
				modalHtml = '<div style="width:100%;display:block"><span style="position:relative;float:right;">'+(parseInt(reservationCount) + parseInt(hardwareCount) + parseInt(nonSerializedCount))+' Available</span></div>';
				modalHtml += '<table style="width: 100%;border: 1px solid black;border-collapse: collapse;">'+thead+'<tbody>';

				if (itemSearch.isserialitem){
					for (i = 0; hardwareRes && i < hardwareRes.length; i++){
						modalHtml += '<tr><td style="border: 1px solid black; padding:2px"><input type="radio" name="hw_avail" value="'+hardwareRes[i].id+'"/></td>'+
							'<td style="border: 1px solid black; padding:2px">'+hardwareRes[i].getValue({name:'name'})+'</td>';
						curRates = hardwareRes[i].getValue('custrecord_bsg_asset_rental_rate_data');

						if (curRates){
							curRates = JSON.parse(curRates);
						}
						for (var z = 0; z < rateHeadRef.length; z++){
							if (curRates && Object.keys(curRates).length){
								for(rate in curRates){
									rt = rate.replace(/ /g,'_');
									if (rateHeadRef[z] == rt){
										modalHtml += '<td style="border: 1px solid black; padding:2px">'+format.format({value:curRates[rate],type:'currency'})+'</td>';
									}
								}
							}else{
								modalHtml += '<td style="border: 1px solid black; padding:2px">N/A</td>';
							}
						}
						modalHtml += '</tr>';
					}

					for (i = 0; reservationRes && i < reservationRes.length; i++){
						if (reservationRes[i].getValue({name:'custrecord_bsg_eqr_resline_serial'})){
							modalHtml += '<tr><td style="border: 1px solid black; padding:2px"><input type="radio" name="hw_avail" value="'+reservationRes[i].getValue({name:'custrecord_bsg_eqr_resline_asset'})+'"/></td>'+
								'<td style="border: 1px solid black; padding:2px">'+reservationRes[i].getValue({name:'custrecord_bsg_eqr_resline_asset.name'})+'</td>';
							modalHtml += '</tr>';
						}
					}
				}else{
					for(i = 0; nonSerializedRes && i < nonSerializedRes.length; i++){
						modalHtml += '<tr><td style="border: 1px solid black; padding:2px">'+nonSerializedRes[i].getValue({name:'locationquantityonhand'})+'</td>';
						curRates = nonSerializedRes[i].getValue('custitem_bsg_rental_rate_data');
						if (curRates){
							curRates = JSON.parse(curRates);
						}
						for (var z = 0; z < rateHeadRef.length; z++){
							if (curRates && Object.keys(curRates).length){
								for(rate in curRates){
									rt = rate.replace(/ /g,'_');
									if (rateHeadRef[z] == rt){
										modalHtml += '<td style="border: 1px solid black; padding:2px">'+format.format({value:curRates[rate],type:'currency'})+'</td>';
									}
								}
							}else{
								modalHtml += '<td style="border: 1px solid black; padding:2px">N/A</td>';
							}
						}
						modalHtml += '</tr>';
					}
				}

				modalHtml += '</tbody></table>';

				jQuery('#eqAvailModal').html(modalHtml);
				equipmentAvailabilityModal.dialog("open");

				jQuery("body").css("cursor", "default");
			},300);
		}

		function getTransactionRestletUrl(){
			var output = url.resolveScript({
				scriptId: 'customscript_bsg_rental_txn_gen_rl',
				deploymentId: 'customdeploy_bsg_rental_txn_gen_rl_1',
				returnExternalUrl: false
			});
			return output;
		}

		function getDomain(){
			var output = url.resolveDomain({
				hostType: url.HostType.APPLICATION,
			});
			return output;
		}

		function createRentalQuote(){
			var curRec = currentRecord.get();
			var curRecId = curRec.id;
			https.post.promise({
				url: getTransactionRestletUrl(),
				body: {
					reservationId:curRec.id,
					recordType: 'estimate'
				}
			}).then(function(response){
				if(response.body){
					try{
						var respObj = JSON.parse(response.body);
						if(respObj.response_code == 200){
							window.location.href = respObj.url;
						}else{
							alert(respObj.error);
						}
					}catch(e){
						alert('An Invalid Response Was Received While Attempting To Create The Tranasction. Try Again!');
					}
				}
			}).catch(function onRejected(reason) {
				alert('An Invalid Response Was Received While Attempting To Create The Tranasction. Try Again!');
			});
		}

		function createRentalOrder(){
			var curRec = currentRecord.get();
			var curRecId = curRec.id;
			https.post.promise({
				url: getTransactionRestletUrl(),
				body: {
					reservationId:curRec.id,
					recordType: 'salesorder'
				}
			}).then(function(response){
				if(response.body){
					try{
						var respObj = JSON.parse(response.body);
						if(respObj.response_code == 200){
							window.location.href = respObj.url;
						}else{
							alert(respObj.error);
						}
					}catch(e){
						alert('An Invalid Response Was Received While Attempting To Create The Tranasction. Try Again!');
					}
				}
			}).catch(function onRejected(reason) {
				alert('An Invalid Response Was Received While Attempting To Create The Tranasction. Try Again!');
			});
		}

		function createRentalInvoice(){
			var curRec = currentRecord.get();
			var curRecId = curRec.id;
			https.post.promise({
				url: getTransactionRestletUrl(),
				body: {
					reservationId:curRec.id,
					recordType: 'invoice'
				}
			}).then(function(response){
				if(response.body){
					try{
						var respObj = JSON.parse(response.body);
						if(respObj.response_code == 200){
							window.location.href = respObj.url;
						}else{
							alert(respObj.error);
						}
					}catch(e){
						alert('An Invalid Response Was Received While Attempting To Create The Tranasction. Try Again!');
					}
				}
			}).catch(function onRejected(reason) {
				alert('An Invalid Response Was Received While Attempting To Create The Tranasction. Try Again!');
			});
		}

		
		function createRentalPurchaseOrder(){
			
			var curRec = currentRecord.get();
			var curRecId = curRec.id;
			https.post.promise({
				url: getTransactionRestletUrl(),
				body: {
					reservationId:curRec.id,
					recordType: 'purchaseorder'
				}
			}).then(function(response){
				if(response.body){
					try{
						var respObj = JSON.parse(response.body);
						if(respObj.response_code == 200){
							window.location.href = respObj.url;
						}else{
							alert(respObj.error);
						}
					}catch(e){
						alert('An Invalid Response Was Received While Attempting To Create The Tranasction. Try Again!');
					}
				}
			}).catch(function onRejected(reason) {
				alert('An Invalid Response Was Received While Attempting To Create The Tranasction. Try Again!');
			});
		}


		function createRentalReturn(){
			var curRec = currentRecord.get();
			var curRecId = curRec.id;
			var recUrls = JSON.parse(curRec.getValue({fieldId:'custpage_recurls'}));

			window.location.href = 'https://system.na1.netsuite.com/'+recUrls.return_record;
		}

		function createRentalPickup(){
			var curRec = currentRecord.get();
			var curRecId = curRec.id;
			var recUrls = JSON.parse(curRec.getValue({fieldId:'custpage_recurls'}));

			window.location.href = 'https://system.na1.netsuite.com/'+recUrls.pickup_record;
		}

		function addRentalKitLineItem(curRec, kit, line){
			if (!curRec.getValue({fieldId:'custrecord_bsg_eqr_rental_item'})){
				return false;
			}
			kit = kit || record.load({type: 'kititem', id: curRec.getValue({fieldId:'custrecord_bsg_eqr_rental_item'})});
			line = line || 0;
			if (kit){
				var lCount = kit.getLineCount({sublistId:'member'});
				if(line == 0){
					setLineData(curRec, kit, line, lCount);
					line++;
				}
				setTimeout(function(){
					setLineData(curRec, kit, line, lCount);
					if(line < lCount){
						line++;
						addRentalKitLineItem(curRec, kit, line);
					}else{
						setTimeout(function(){
							curRec.commitLine({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation'});
						},500);
					}
				},800);
			}
		}

		function setLineData(curRec, kit, line, lCount){
			if (line == lCount){
				return false;
			}
			if (line > 0){
				//Commit Last Line
				curRec.commitLine({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation'});
			}
			if (kit.getSublistValue({sublistId:'member',fieldId:'item',line:line})){
				curRec.selectNewLine({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation'});
				curRec.setCurrentSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_item',value:kit.getSublistValue({sublistId:'member',fieldId:'item',line:line})});
				curRec.setCurrentSublistValue({sublistId:'recmachcustrecord_bsg_eqr_resline_reservation',fieldId:'custrecord_bsg_eqr_resline_qty',value:kit.getSublistValue({sublistId:'member',fieldId:'quantity',line:line})});
			}
		}

		function adjustRentalInventory(){
			jQuery("body").css("cursor", "progress");
			setTimeout(function(){
				try{
					var settings = accountSettings.getSettings();
					var rentedInventoryLocation = settings.RentedInventoryLocation;
					var rentedBinNumber = settings.RentedBinNumber;
					var lineItemSublist = 'recmachcustrecord_bsg_eqr_returnline_pickup';
					var reservationField = 'custrecord_bsg_eqr_pickup_reservation';
					var hasSubsidiaries = runtime.isFeatureInEffect({feature:'SUBSIDIARIES'});
					var invSearch, res, transferFromLocation, transferFromBin, columns, tempObj, tRec, transferLines = [];
					var rec = currentRecord.get();
					var isPickup = (rec.type == 'customrecord_bsg_eqr_pickup');
					var locData = {};

					if (isPickup){
						if (!window.contextMode){
							rec = record.load({
								type: 'customrecord_bsg_eqr_pickup',
								id: rec.id
							});
						}
					}else{
						if (!window.contextMode){
							rec = record.load({
								type: 'customrecord_bsg_eqr_return',
								id: rec.id
							});
						}
						lineItemSublist = 'recmachcustrecord_bsg_eqr_returnline_rec';
						reservationField = 'custrecord_bsg_eqr_return_reservation';
					}

					var lineCount = rec.getLineCount({sublistId:lineItemSublist});
					for(var i = 0; i < lineCount; i++){
						var item = rec.getSublistValue({sublistId:lineItemSublist,line:i,fieldId:'custrecord_bsg_eqr_returnline_item'});
						var hardwareRec = rec.getSublistValue({sublistId:lineItemSublist,line:i,fieldId:'custrecord_bsg_eqr_returnline_hardware'});
						var quantity = rec.getSublistValue({sublistId:lineItemSublist,line:i,fieldId:'custrecord_bsg_eqr_returnline_qty'});
						var serial = rec.getSublistValue({sublistId:lineItemSublist,line:i,fieldId:'custrecord_bsg_eqr_returnline_serial'});
						var itemSearch = search.lookupFields({
							type: 'inventoryitem',
							id: item,
							columns: ['usebins','isserialitem']
						});
						console.log('Item Search',JSON.parse(JSON.stringify(itemSearch)));
						if (itemSearch.isserialitem){
							//Handle Serialized Item
							if (itemSearch.usebins && runtime.isFeatureInEffect({feature:'ADVBINSERIALLOTMGMT'})){
								columns = ['inventorynumberbinonhand.binnumber','inventorynumberbinonhand.location','inventorynumberbinonhand.inventorynumber'];
								invSearch = search.create({
									type: 'item',
									filters: [
										['inventorynumberbinonhand.inventorynumber', 'is', serial],
										'and',
										['inventorynumberbinonhand.quantityonhand','greaterthan',0]
									],
									columns: columns
								});
								res = invSearch.run().getRange({start:0, end:10});
								console.log('SERIAL BIN SEARCH RES',JSON.parse(JSON.stringify(res)));
								if (res.length){
									tempObj = {
										item: item,
										hardware_rec: hardwareRec,
										quantity: quantity,
										serial: serial,
										id: res[0].getValue({name:'inventorynumber',join:'inventorynumberbinonhand'}),
										from_location: res[0].getValue({name:'location',join:'inventorynumberbinonhand'}),
										from_bin: res[0].getValue({name:'binnumber',join:'inventorynumberbinonhand'}),
									};
									console.log(res[0].getValue({name:'location',join:'inventorynumberbinonhand'}));
									if (hasSubsidiaries){
										if (!locData[res[0].getValue({name:'location',join:'inventorynumberbinonhand'})]){
											tRec = record.load({
												type:'location',
												id:res[0].getValue({name:'location',join:'inventorynumberbinonhand'})
											});
											locData[res[0].getValue({name:'location',join:'inventorynumberbinonhand'})] = tRec;
										}
										tempObj.subsidiary = locData[res[0].getValue({name:'location',join:'inventorynumberbinonhand'})].getValue({fieldId:'subsidiary'});
									}
									if (!isPickup){
										tempObj.to_location = rec.getSublistValue({sublistId:lineItemSublist,line:i,fieldId:'custrecord_bsg_eqr_returnline_location'});
									}
									transferLines.push(tempObj);
								}
							}else if(itemSearch.usebins){
								alert('Advanced Bin Management Required! Please contact Administrator to enable the Advanced Bin Management Feature!');
								return false;
							}else{
								columns = ['location'];
								invSearch = search.create({
									type: 'inventorynumber',
									filters: [
										['inventorynumber','is',serial],
										'and',
										['quantityonhand','greaterthan',0]
									],
									columns: columns
								});
								res = invSearch.run().getRange({start:0, end:10});
								console.log('SERIAL SEARCH RES',JSON.parse(JSON.stringify(res)));
								if (res.length){
									tempObj = {
										item: item,
										hardware_rec: hardwareRec,
										quantity: quantity,
										serial: serial,
										id: res[0].id,
										from_location: res[0].getValue({name:'location'}),
										from_bin: null
									};
									if (hasSubsidiaries){
										if (!locData[res[0].getValue({name:'location'})]){
											tRec = record.load({
												type:'location',
												id:res[0].getValue({name:'location'})
											});
											locData[res[0].getValue({name:'location'})] = tRec;
										}
										tempObj.subsidiary = locData[res[0].getValue({name:'location'})].getValue({fieldId:'subsidiary'});
									}
									if (!isPickup){
										tempObj.to_location = rec.getSublistValue({sublistId:lineItemSublist,line:i,fieldId:'custrecord_bsg_eqr_returnline_location'});
									}
									transferLines.push(tempObj);
								}
							}
						}else{
							//Handle Non Serialized Item
							var toLoc;
							if (isPickup){
								var loc = search.lookupFields({
									type: 'customrecord_bsg_eqr_reservation',
									id: rec.getValue({fieldId:reservationField}),
									columns: ['custrecord_bsg_eqr_res_loc']
								});
								if (loc && loc.custrecord_bsg_eqr_res_loc){
									toLoc = loc.custrecord_bsg_eqr_res_loc[0].value;
								}
							}else{
								toLoc = rentedInventoryLocation;
							}

							if (toLoc){
								invSearch = search.create({
									type: 'inventoryitem',
									filters: [
										['internalid','is',item],
										'and',
										['inventorylocation','is',toLoc],
										'and',
										['locationquantityonhand','greaterthan',0]
									],
									columns: []
								});
								res = invSearch.run().getRange({start:0, end:100});
								console.log('Non Serialized Res',JSON.parse(JSON.stringify(res)));
								if (res.length){
									tempObj = {
										item: item,
										hardware_rec: null,
										quantity: quantity,
										serial: null,
										id: null,
										from_location: toLoc,
										from_bin: null
									};
									if (hasSubsidiaries){
										if (!locData[toLoc]){
											tRec = record.load({
												type:'location',
												id:toLoc
											});
											locData[toLoc] = tRec;
										}
										tempObj.subsidiary = locData[toLoc].getValue({fieldId:'subsidiary'});
									}
									if (!isPickup){
										tempObj.to_location = rec.getSublistValue({sublistId:lineItemSublist,line:i,fieldId:'custrecord_bsg_eqr_returnline_location'});
									}
									transferLines.push(tempObj);
								}
							}
						}
					}

					if (!transferLines.length){
						jQuery("body").css("cursor", "default");
						alert('No Inventory To Adjust! Check Inventory On Items!');
						return false;
					}

					//GET SUBSIDIARY IF NECESSARY
					if (hasSubsidiaries){
						if (!locData[rentedInventoryLocation]){
							tRec = record.load({
								type:'location',
								id:rentedInventoryLocation
							});
							locData[rentedInventoryLocation] = tRec;
						}
					}

					//CREATE INVENTORY TRANSFER RECORD
					console.log('Transfer Lines',transferLines);
					var transferRec = record.create({type:'inventorytransfer', isDynamic: true});

					//Hard Code Subsidiary For Now To 17
					if (runtime.isFeatureInEffect({feature:'SUBSIDIARIES'})){
						transferRec.setValue({fieldId:'subsidiary', value:locData[rentedInventoryLocation].getValue({fieldId:'subsidiary'})});
					}
					if (!isPickup){
						rentedInventoryLocation = transferLines[0].to_location;
					}
					transferRec.setValue({fieldId:'location', value:transferLines[0].from_location});
					transferRec.setValue({fieldId:'transferlocation', value:rentedInventoryLocation});
					transferRec.setValue({fieldId:'memo',value:'Transfer by rental pickup: ' + rec.getValue({fieldId:'name'})});

					for (var i = 0; i < transferLines.length; i++){
						transferRec.selectNewLine({sublistId:'inventory'});
						transferRec.setCurrentSublistValue({sublistId:'inventory',fieldId:'item',value:transferLines[i].item});
						transferRec.setCurrentSublistValue({sublistId:'inventory',fieldId:'location',value:transferLines[i].from_location});
						transferRec.setCurrentSublistValue({sublistId:'inventory',fieldId:'adjustqtyby',value:transferLines[i].quantity});

						if (transferLines[i].serial || transferLines[0].from_bin){
							var invDetail = transferRec.getCurrentSublistSubrecord({sublistId:'inventory',fieldId:'inventorydetail',line:i});
							invDetail.selectNewLine({sublistId:'inventoryassignment'});
							if(transferLines[i].serial){
								invDetail.setCurrentSublistValue({sublistId:'inventoryassignment',fieldId:'issueinventorynumber',value:transferLines[i].id});
								invDetail.setCurrentSublistValue({sublistId:'inventoryassignment',fieldId:'quantity',value:transferLines[i].quantity});
							}
							if (transferLines[i].from_bin){
								invDetail.setCurrentSublistValue({sublistId:'inventoryassignment',fieldId:'tobinnumber',value:rentedBinNumber});
							}
							invDetail.commitLine({sublistId:'inventoryassignment'});
						}
						transferRec.commitLine({sublistId:'inventory'});
					}
					console.log('BEFORE TRANSFER SAVE',JSON.parse(JSON.stringify(transferRec)));
					transferRec.save();

					console.log('TRANSFER SAVED!',transferRec);
					//SET INVENTORY ADJUSTED ON RECORD
					if (isPickup){
						rec.setValue({fieldId:'custrecord_bsg_eqr_pickup_inv_adjusted',value:true});
					}else{
						rec.setValue({fieldId:'custrecord_bsg_eqr_return_inv_adjusted',value:true});
					}

					console.log('INV ADJUSTED SET');

					//SEARCH FOR RESERVATION LINES
					var f = [];
					if (isPickup){
						f.push(['custrecord_bsg_eqr_resline_reservation','is',rec.getValue({fieldId:'custrecord_bsg_eqr_pickup_reservation'})]);
						f.push('and');
						f.push(['custrecord_bsg_eqr_resline_pickedup','is','F']);
					}else{
						f.push(['custrecord_bsg_eqr_resline_reservation','is',rec.getValue({fieldId:'custrecord_bsg_eqr_return_reservation'})]);
						f.push('and');
						f.push(['custrecord_bsg_eqr_resline_returned','is','F']);
					}
					var resLineSearch = search.create({
						type: 'customrecord_bsg_eqr_reservation_line',
						filters: f,
						columns: ['custrecord_bsg_eqr_resline_qty','custrecord_bsg_eqr_resline_item','custrecord_bsg_eqr_resline_asset']
					});
					var resLineRes = resLineSearch.run().getRange({start:0,end:1000});

					console.log('RESLINE SEARCH RES',resLineRes);

					//SET INVENTORY ADJUSTED ON RESERVATION LINES AND UPDATE HARDWARE RECORDS
					for (var i = 0; i < transferLines.length; i++){
						//UPDATE HARDWARE RECORD STATUS
						if (transferLines[i].hardware_rec){
							if (isPickup){
								record.submitFields({
									type:'customrecord_bsg_asset_card',
									id: transferLines[i].hardware_rec,
									values: {
										custrecord_bsg_eqr_hardware_status:2 //Rented
									}
								});
							}else{
								record.submitFields({
									type:'customrecord_bsg_asset_card',
									id: transferLines[i].hardware_rec,
									values: {
										custrecord_bsg_eqr_hardware_status:1 //Available
									}
								});
							}
							console.log('HARDWARE RECORD UPDATED');
						}

						for(var z = 0; z < resLineRes.length; z++){
							var doUpdate = false;
							if (transferLines[i].item == resLineRes[z].getValue({name:'custrecord_bsg_eqr_resline_item'})){
								if (transferLines[i].hardware_rec && (transferLines[i].hardware_rec == resLineRes[z].getValue({name:'custrecord_bsg_eqr_resline_asset'}))){
									doUpdate = true;
								}else{
									if (transferLines[i].quantity >= resLineRes[z].getValue({name:'custrecord_bsg_eqr_resline_qty'})){
										doUpdate = true;
									}
								}
								console.log('DO UPDATE',doUpdate);
								if (doUpdate){
									console.log('DOING UPDATE ID: ',resLineRes[z].id);
									console.log('IS PICKUP',isPickup);
									if (isPickup){
										record.submitFields({
											type:'customrecord_bsg_eqr_reservation_line',
											id: resLineRes[z].id,
											values: {
												custrecord_bsg_eqr_resline_pickedup: 'T',
												custrecord_bsg_eqr_resline_returned: 'F'
											}
										});
									}else{
										record.submitFields({
											type:'customrecord_bsg_eqr_reservation_line',
											id: resLineRes[z].id,
											values: {
												custrecord_bsg_eqr_resline_returned: 'T',
												custrecord_bsg_eqr_resline_pickedup: 'F',
											}
										});
									}
								}
								console.log('UPDATE WAS DONE!');
							}
						}
					}
					record.submitFields({
						type: 'customrecord_bsg_eqr_reservation',
						id: rec.getValue({fieldId:reservationField}),
						values:{
							custrecord_bsg_eqr_res_status:3 //In Progress
						}
					});
					if (window.contextMode){
						jQuery('form[name="main_form"]').submit();
						jQuery("body").css("cursor", "default");
					}else{
						rec.save();
						jQuery("body").css("cursor", "default");
						window.location.reload();
					}
				}catch(e){
					jQuery("body").css("cursor", "default");
					console.log('An Error Occurred During The Transfer! NS Error: '+e.message);
				}
			},300);
		}

		function printRentalAgreement(){
			var urlString = url.resolveScript({
				scriptId: 'customscript_sl_rental_reservation',
				deploymentId: 'customdeploy_sl_rental_reservation',
				returnExternalUrl: false,
				params: {
					rental: currentRecord.get().id
				}
			});
			window.open(urlString);
		}

		function getAssetRentalRates(assetCard){
			var rateSearch = search.create({
				type: 'customrecord_bsg_rental_asset_rates',
				filters: [
					['custrecord_bsg_rental_asset_rates_asset','is',assetCard]
				],
				columns: ['custrecord_bsg_rental_asset_rates_cat','custrecord_bsg_rental_asset_rates_rate']
			});
			var rateRes = rateSearch.run().getRange({start:0,end:100});
			return rateRes;
		}

		function getItemRentalRates(item){
			var rateSearch = search.create({
				type: 'customrecord_bsg_rental_item_rates',
				filters: [
					['custrecord_bsg_rental_item_rates_item','is',item]
				],
				columns: ['custrecord_bsg_rental_item_rates_cat','custrecord_bsg_rental_item_rates_rate']
			});
			var rateRes = rateSearch.run().getRange({start:0,end:100});
			return rateRes;
		}

		function createRentalAgreement(){
			var settings = accountSettings.getSettings();
			var cDomain = getDomain();
			var urlString = 'https://'+getDomain()+'/app/common/custom/custrecordentry.nl?rectype='+settings.getValue({fieldId:'custrecord_bsg_settings_rental_rec_type'})+'&quote_id='+currentRecord.get().id;
			window.open(urlString);
		}

		return {
			searchAvailableEquipment: searchAvailableEquipment,
			createRentalOrder: createRentalOrder,
			createRentalQuote: createRentalQuote,
			createRentalInvoice: createRentalInvoice,
			createRentalPurchaseOrder : createRentalPurchaseOrder,
			addRentalKitLineItem: addRentalKitLineItem,
			createRentalReturn: createRentalReturn,
			createRentalPickup: createRentalPickup,
			adjustRentalInventory: adjustRentalInventory,
			printRentalAgreement: printRentalAgreement,
			getAssetRentalRates: getAssetRentalRates,
			getItemRentalRates: getItemRentalRates,
			createRentalAgreement: createRentalAgreement
		};
	}
);