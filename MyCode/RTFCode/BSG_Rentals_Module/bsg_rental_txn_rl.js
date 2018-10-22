/**
 * bsg_rental_txn_rl.js
 * @NApiVersion 2.x
 * @NScriptType Restlet
 */
define(['N/url','N/search'],
	function(url, search){
		function _post(context){
			var response;
			if(!context.reservationId){
				return {"response_code":400,"error":"A Reservation Id Is Required To Process The Request!"};
			}
			if(!context.recordType){
				return {"response_code":400,"error":"A Record Type Is Required To Process The Request!"};
			}

			//Get Bill To From Rental Agreement
			var rentalAgreement = search.lookupFields({
				type: 'customrecord_bsg_eqr_reservation',
				id: context.reservationId,
				columns: ['custrecord_bsg_eqr_res_customer']
			});

			if(!rentalAgreement.custrecord_bsg_eqr_res_customer.length){
				return {"response_code":400,"error":"An Billing Customer Is Required To Process The Request!"};
			}

			switch(context.recordType){
				case 'estimate':
					recTaskLink = 'EDIT_TRAN_ESTIMATE';
					break;
				case 'salesorder':
					recTaskLink = 'EDIT_TRAN_SALESORD';
					break;
				case 'invoice':
					recTaskLink = 'EDIT_TRAN_CUSTINVC';
					break;
				case 'purchaseorder':
					recTaskLink = 'EDIT_TRAN_PURCHORD';
					break;
			}

			var recUrl = url.resolveTaskLink({
				id: recTaskLink,
				params: {
					rental_id: context.reservationId,
					entity: rentalAgreement.custrecord_bsg_eqr_res_customer[0].value
				}
			});
			if (!recUrl){
				return {"response_code":400,"error":"Unable To Resolve The Record URL. Contact Your Administrator."};
			}

			return {"response_code":200,"url":recUrl};
		}

		return {
			post: _post
		};
	}
);