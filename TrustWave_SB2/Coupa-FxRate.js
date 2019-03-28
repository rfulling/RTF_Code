/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       03 Jun 2014     rohitjalisatgi
 *
 */

/**
 * @param {String}
 *            type Context Types: scheduled, ondemand, userinterface, aborted,
 *            skipped
 * @returns {Void}
 */
function scheduled(type) {
	// var filters = new Array();
	// filters[0] = new nlobjSearchFilter( 'isbasecurrency', null, 'anyof', 'T'
	// );

	// Define search columns
	// var columns = new Array();
	// columns[0] = new nlobjSearchColumn( 'symbol' );
	// columns[1] = new nlobjSearchColumn( 'total' );

	var context = nlapiGetContext();
	var allCurr = new Array();
	var baseCurr = new Array();
	var baseCurrCounter = 0;
	var currCount = 0;
	var baseCurrCount = 0;
	var rateDate;

	// var rate = 0;

	var now = new Date;
	var todayutc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now
			.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now
			.getUTCSeconds(), now.getUTCMilliseconds());
	var today = new Date(todayutc);

	// get today's date in the format yyyy-mm-dd
	var yyyy = today.getFullYear().toString();
	var mm = (today.getMonth() + 1).toString(); // getMonth() is zero-based
	var dd = today.getDate().toString();
	var hr = today.getHours().toString();
	var mn = today.getMinutes().toString();
	var ss = today.getSeconds().toString();
	var offset = 7;

	if (nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_fxrate_utcoffset'))
		offset = nlapiGetContext().getSetting('SCRIPT',
				'custscript_coupa_fxrate_utcoffset');
	offset = offset.toString();

	rateDate = yyyy + '-' + (mm[1] ? mm : "0" + mm[0]) + '-'
			+ (dd[1] ? dd : "0" + dd[0]) + "T" + (hr[1] ? hr : "0" + hr[0])
			+ ":" + (mn[1] ? mn : "0" + mn[0]) + ":"
			+ (ss[1] ? ss : "0" + ss[0]) + "-"
			+ (offset[1] ? offset : "0" + offset[0]) + ":00";

	nlapiLogExecution('DEBUG', 'Timestamp = ', rateDate);

	// set up headers
	var headers = new Array();
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_fxrate_apikey');

	// set up URL
	var url = nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_fxrate_url')
			+ "/api/exchange_rates";
	
	var thisEnv = context.getEnvironment();
	var url_test_contains = [ "-dev", "-demo", "-dmo", "-qa", "-sandbox",
			"-sbx", "-stage", "-staging", "-stg", "-support", "-test", "-uat",
			"coupacloud.com", "coupadev.com" ];

	// Ensure test url in a non production environment.
	try {
		if (thisEnv != 'PRODUCTION') {
			var test_url = false;
			for (var i = 0; i < url_test_contains.length; i++) {
				if (url.indexOf(url_test_contains[i]) > -1) {
					test_url = true;
				}
			}
			if (!test_url) {
				var errMsg = 'Error - script is running in non prod environment and not using a '
						+ url_test_contains
						+ ' in the coupa URL. If you believe this to be incorrect, please contact Coupa Support';
				throw nlapiCreateError('BadEnv', errMsg, false);
			}
		}
	} catch (error) {
		var errordetails;
		errorcode = error.getCode();
		errordetails = error.getDetails() + ".";

		nlapiLogExecution(
				'ERROR',
				'Processing Error - Unable to do Coupa request api call to import Exchange Rates',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		nlapiSendEmail(
				-5,
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_fxrate_erroremailnotify'),
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_fxrate_accountname')
						+ ' Exchange Rate Integration:Processing Error - Unable to do Coupa request api call to import Exchange Rates',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		throw error;
	}

	var searchresults = nlapiSearchRecord('currency', null, null);

	if (searchresults) {
		currCount = searchresults.length;
		for (var i = 0; i < currCount; i++) {
			// nlapiLogExecution('DEBUG', 'Search results','Record Type = ' +
			// searchresults[i].getRecordType() + ' Id = ' +
			// searchresults[i].getId());

			var curr = nlapiLoadRecord('currency', searchresults[i].getId());

			// nlapiLogExecution('DEBUG', 'Currency Info','Currency Code = ' +
			// curr.getFieldValue('symbol') + ' IsBaseCurrency ' +
			// curr.getFieldValue('isbasecurrency'));
			if (curr.getFieldValue('isbasecurrency') == 'T') {
				baseCurr[baseCurrCounter] = curr.getFieldValue('symbol');
				baseCurrCounter = baseCurrCounter + 1;
			}
			allCurr[i] = curr.getFieldValue('symbol');
		}

		baseCurrCount = baseCurrCounter;

		// nlapiLogExecution('DEBUG', 'Currency Counters','Base Currency Counter
		// = ' + baseCurrCount
		// + ' Currency Counter = ' + currCount);

		for (var i = 0; i < baseCurrCount; i++) {

			for (var j = 0; j < currCount; j++) {
				// nlapiLogExecution('DEBUG', 'Currency FX
				// Conversion','Converting from Base = ' + baseCurr[i] + '
				// Currency To = ' + allCurr[j]);
				var rate = '';
				try {

					if (baseCurr[i] != allCurr[j]) {

						rate = nlapiExchangeRate(allCurr[j], baseCurr[i]);
						nlapiLogExecution('DEBUG', 'Currency FX Conversion',
								'Converting from Base = ' + baseCurr[i]
										+ ' Currency To = ' + allCurr[j]
										+ ' FxRate = ' + rate + ' Ratedate = '
										+ rateDate);

						var postData = "<?xml version='1.0' encoding='UTF-8'?>"
								+ "<exchange-rate><from-currency>" + "<code>"
								+ allCurr[j] + "</code>"
								+ "</from-currency><to-currency>" + "<code>"
								+ baseCurr[i] + "</code>" + "</to-currency>"
								+ "<rate type='decimal'>" + rate + "</rate>"
								+ "<rate-date type='datetime'>" + rateDate
								+ "</rate-date>" + "</exchange-rate>";

						var response = nlapiRequestURL(url, postData, headers);
						if (response.getCode() == '201'
								|| response.getCode() == '200') {
							nlapiLogExecution('AUDIT',
									'Successfully loaded FX Rate',
									'Converting from Base = ' + baseCurr[i]
											+ ' Currency To = ' + allCurr[j]
											+ ' FxRate = ' + rate
											+ ' Ratedate = ' + rateDate);
						}

						else {
							nlapiLogExecution('ERROR', 'Error loading FX Rate',
									'Converting from Base = ' + baseCurr[i]
											+ ' Currency To = ' + allCurr[j]
											+ ' FxRate = ' + rate
											+ ' Ratedate = ' + rateDate);
							nlapiSendEmail(
									-5,
									context
											.getSetting('SCRIPT',
													'custscript_coupa_fxrate_erroremailnotify'),
									context
											.getSetting('SCRIPT',
													'custscript_coupa_fxrate_accountname')
											+ ' - Error loading FxRate in Coupa',
									' Converting from Base = ' + baseCurr[i]
											+ ' Currency To = ' + allCurr[j]
											+ ' FxRate = ' + rate
											+ ' Ratedate = ' + rateDate
											+ ' Response Error Code:'
											+ response.getCode());
						}

					} // end of if (baseCurr[i] != allCurr[j])
				} // end of try block
				catch (e) {
					nlapiLogExecution('ERROR', 'Error loading FX Rate',
							'Converting from Base = ' + baseCurr[i]
									+ ' Currency To = ' + allCurr[j]
									+ ' FxRate = ' + rate + ' Ratedate = '
									+ rateDate);
					nlapiSendEmail(-5, context.getSetting('SCRIPT',
							'custscript_coupa_fxrate_erroremailnotify'),
							context.getSetting('SCRIPT',
									'custscript_coupa_fxrate_accountname')
									+ ' - Error loading FxRate in Coupa',
							' Converting from Base = ' + baseCurr[i]
									+ ' Currency To = ' + allCurr[j]
									+ ' FxRate = ' + rate + ' Ratedate = '
									+ rateDate + ' Error Message' + e.message);
				} // end of catch block
			} // end of for (var j = 0; j < currCount ; j++)
		}
	}

}