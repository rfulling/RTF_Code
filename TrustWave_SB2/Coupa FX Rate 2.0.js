/**
 * @NApiVersion 2.x
 * @NScriptType MapReduceScript
 * @NModuleScope SameAccount
 */
define(
		[ 'N/currency', 'N/email', 'N/https', 'N/search', 'N/runtime',
				'N/record', 'N/error', 'N/xml' ],
		/**
		 * @param {currency}
		 *            currency
		 * @param {email}
		 *            email
		 * @param {https}
		 *            https
		 * @param {search}
		 *            search
		 * @param {runtime}
		 *            runtime
		 */
		function(currency, email, https, search, runtime, record, error, xml) {

			/**
			 * Marks the beginning of the Map/Reduce process and generates input
			 * data.
			 * 
			 * @typedef {Object} ObjectRef
			 * @property {number} id - Internal ID of the record instance
			 * @property {string} type - Record type id
			 * 
			 * @return {Array|Object|Search|RecordRef} inputSummary
			 * @since 2015.1
			 */
			function getInputData() {
				var currSearch = search.create({
					type : search.Type.CURRENCY,
					filters : [ [ 'isinactive', search.Operator.IS, false ] ],
					columns : [ 'symbol' ]
				});

				return currSearch;
			}

			/**
			 * Executes when the map entry point is triggered and applies to
			 * each key/value pair.
			 * 
			 * @param {MapSummary}
			 *            context - Data collection containing the key/value
			 *            pairs to process through the map stage
			 * @since 2015.1
			 */
			function map(context) {
				var searchResult = JSON.parse(context.value);
				log.debug("In map", searchResult);
				var baseCurrency = record.load({
					type : record.Type.CURRENCY,
					id : searchResult.id
				});
				if (baseCurrency.getValue('isbasecurrency') == false) {
					return;
				}
				var baseSymbol = baseCurrency.getValue('symbol');
				var allSearch = search.create({
					type : search.Type.CURRENCY,
					filters : [ [ 'isinactive', search.Operator.IS, false ] ],
					columns : [ 'symbol' ]
				});
				// As of development, there are 249 ISO recognized currencies
				var allCurrencies = allSearch.run().getRange(0, 250);
				for (var i = 0; i < allCurrencies.length; i++) {
					var currSymbol = allCurrencies[i].getValue('symbol');
					log.debug("converting from: " + currSymbol, "to: "
							+ baseSymbol);
					if (currSymbol != baseSymbol) {
						var rate = currency.exchangeRate({
							source : currSymbol,
							target : baseSymbol
						});
						context.write({
							key : currSymbol + "|" + baseSymbol,
							value : rate
						});
					}
				}
				;

			}

			/**
			 * Executes when the reduce entry point is triggered and applies to
			 * each group.
			 * 
			 * @param {ReduceSummary}
			 *            context - Data collection containing the groups to
			 *            process through the reduce stage
			 * @since 2015.1
			 */
			function reduce(context) {
				var scriptRef = runtime.getCurrentScript();
				var postUrl = scriptRef
						.getParameter('custscript_coupa_fxrate_url2')
						+ "/api/exchange_rates";
				var api_key = scriptRef
						.getParameter('custscript_coupa_fxrate_apikey2');
				var postHeaders = {
					'Accept' : 'text/xml',
					'X-COUPA-API-KEY' : api_key
				};

				var now = new Date;
				var todayutc = Date.UTC(now.getUTCFullYear(),
						now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(),
						now.getUTCMinutes(), now.getUTCSeconds(), now
								.getUTCMilliseconds());
				var today = new Date(todayutc);

				// get today's date in the format yyyy-mm-dd
				var yyyy = today.getFullYear().toString();
				var mm = (today.getMonth() + 1).toString(); // getMonth() is
				// zero-based
				var dd = today.getDate().toString();
				var hr = today.getHours().toString();
				var mn = today.getMinutes().toString();
				var ss = today.getSeconds().toString();
				var offset = 7;

				if (scriptRef.getParameter('custscript_coupa_fxrate_utcoffset2'))
					offset = scriptRef
							.getParameter('custscript_coupa_fxrate_utcoffset2');
				offset = offset.toString();

				// set date in format yyy-mm-ddThh:mm:ss-zz:00
				var rateDate = yyyy + '-' + (mm[1] ? mm : "0" + mm[0]) + '-'
						+ (dd[1] ? dd : "0" + dd[0]) + "T"
						+ (hr[1] ? hr : "0" + hr[0]) + ":"
						+ (mn[1] ? mn : "0" + mn[0]) + ":"
						+ (ss[1] ? ss : "0" + ss[0]) + "-"
						+ (offset[1] ? offset : "0" + offset[0]) + ":00";

				// should only ever be one value returned as the keys will be unique above
				for ( var i in context.values) {
					
					log.debug("key: " + context.key, "rate: "
							+ context.values[i]);
					var fromCurr = context.key.split('|')[0];
					var baseCurr = context.key.split('|')[1];
					var postData = "<?xml version='1.0' encoding='UTF-8'?><exchange-rate>"
							+ "<from-currency><code>"
							+ fromCurr
							+ "</code></from-currency>"
							+ "<to-currency><code>"
							+ baseCurr
							+ "</code></to-currency>"
							+ "<rate type='decimal'>"
							+ context.values[i]
							+ "</rate>"
							+ "<rate-date type='datetime'>"
							+ rateDate + "</rate-date>" + "</exchange-rate>";
					log.debug('Payload: ', postData);
					var response = https.post({
						url : postUrl,
						body : postData,
						headers : postHeaders
					});

					if (response.code == 201 || response.code == 200) {
						// good response
						log.audit('Succesfully created exchange rate',
								context.key + ' loaded to Coupa with rate '
										+ context.values[i] + ' and rateDate ' + rateDate);

					} else {
						// bad response
						var err = error.create({
							name : 'COUPA_POST_ERROR',
							message : 'Failed to Post to Coupa. Received code'
									+ response.code + ' with response: '
									+ response.body
						});
						err.toString = function() {
							return err.message;
						};
						throw err;
					}
				}
			}

			/**
			 * Executes when the summarize entry point is triggered and applies
			 * to the result set.
			 * 
			 * @param {Summary}
			 *            summary - Holds statistics regarding the execution of
			 *            a map/reduce script
			 * @since 2015.1
			 */
			function summarize(summary) {
				log.audit('Useage/Governance consumed: ', summary.usage);
				log.audit('Number of queues: ', summary.concurrency);
				log.audit('Number of Yields: ', summary.yields);

				log.error('Input Error: ', summary.inputSummary.error);

				summary.mapSummary.errors.iterator().each(
						function(code, message) {
							log.error('Map Error: ' + code, message);
						});

				summary.reduceSummary.errors.iterator().each(
						function(code, message) {
							log.error('Map Error: ' + code, message);
						});
			}

			return {
				getInputData : getInputData,
				map : map,
				reduce : reduce,
				summarize : summarize
			};

		});
