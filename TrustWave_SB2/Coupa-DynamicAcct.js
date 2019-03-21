/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       30 Jun 2015     ianmcnelly	   Initial revision
 * 1.10       09 Jul 2015     ianmcnelly       Improvements to search, add subsidiary to supported segments, change account to use gl# instead of id, add check for subsidiaries not included in Coupa
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your
 * script deployment.
 * 
 * @appliedtorecord Account, Department, Location, Class, Subsidiary
 * 
 * @param {String}
 *            type Operation types: create, edit, delete, xedit, approve,
 *            cancel, reject (SO, ER, Time Bill, PO & RMA only) pack, ship (IF
 *            only) dropship, specialorder, orderitems (PO only) paybills
 *            (vendor payments)
 * @returns {Void}
 */
function userEventAfterSubmit(type) {

	// Make sure names are unique for only subsidiary -> using namenoheirarchy,
	// Subsidiary as a segment - Disable subs only disables segment
	// not COA (make clear in Docs)

	nlapiLogExecution('AUDIT', 'Account Integration Script Called ', 'type = '
			+ type + ' recordid = ' + nlapiGetRecordId());

	var record = nlapiGetNewRecord();
	if (type == 'delete') {
		record = nlapiGetOldRecord();
	}
	var currentType = nlapiGetRecordType();
	var recordName = '';
	var recordID = record.getId();
	var context = nlapiGetContext();
	var param_APIKey = context.getSetting('SCRIPT',
			'custscript_coupa_accs_apikey');
	var accntNumber = "";
	if (currentType == 'account') {
		recordName = record.getFieldValue('acctname');
		accntNumber = record.getFieldValue('acctnumber');
	} else {
		recordName = record.getFieldValue('name');
	}
	nlapiLogExecution('AUDIT', 'Account Details ', 'Name = ' + recordName+ ' Type = ' + currentType);

	// Setting up Headers
	var headers = new Array();
	headers['Accept'] = 'text/xml';
	headers['X-COUPA-API-KEY'] = param_APIKey;

	var url = nlapiGetContext().getSetting('SCRIPT','custscript_coupa_accs_url')+ '/api/lookup_values';
	
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
				'Processing Error - Unable to do Coupa request api call to import Lookup Values',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		nlapiSendEmail(
				-5,
				nlapiGetContext().getSetting('SCRIPT',
						'custscript_coupa_accs_notify_email'),
				'Chart of Account Integration:Processing Error - Unable to do Coupa request api call to import Lookup Values',
				'Error Code = ' + errorcode + ' Error Description = '
						+ errordetails);
		throw error;
	}

	var Isinactive = false;

	if (nlapiGetContext().getSetting('SCRIPT','custscript_coupa_accs_cstmfldincludeonly')) {
		var custfieldincludeonly = nlapiGetContext().getSetting('SCRIPT','custscript_coupa_accs_cstmfldincludeonly');
		var newrecord = nlapiGetNewRecord();
		var oldrecord = nlapiGetOldRecord();

		if (type == 'create') {
			if (newrecord.getFieldValue(custfieldincludeonly) == 'F'
					|| newrecord.getFieldValue(custfieldincludeonly) != 'T') {
				nlapiLogExecution('AUDIT', 'Skipping ' + currentType
						+ ' creation - - as DO NOT INCLUDE in COUPA set',
						currentType + ' = ' + recordName + ' Id = '
								+ nlapiGetRecordId());
				return;
			}
		}

		if (type == 'edit') {
			if (newrecord.getFieldValue(custfieldincludeonly) == 'F' && oldrecord.getFieldValue(custfieldincludeonly) != 'F') {
				Isinactive = true;
			}
			if (newrecord.getFieldValue(custfieldincludeonly) == 'F'
					&& oldrecord.getFieldValue(custfieldincludeonly) == 'F') {
				nlapiLogExecution('AUDIT', 'Skipping ' + currentType
						+ ' creation - - as DO NOT INCLUDE in COUPA set',
						currentType + ' = ' + recordName + ' Id = '
								+ nlapiGetRecordId());
				return;
			}
		}

		if (type == 'delete') {
			Isinactive = true;
		}
	}

	try {

		var postData = "<?xml version='1.0' encoding='UTF-8'?> <lookup-value>";

		var out_status;
		if (record.getFieldValue('isinactive') == 'T' || Isinactive == true) {
			out_status = "false";
		} else {
			out_status = "true";
		}

		postData = postData + "<active>" + out_status + "</active>";

		nlapiLogExecution('DEBUG', 'Setting ' + currentType + ' status = ',out_status);

		var lookupList = getLookupList(recordID, currentType);
		var lookupValueName = lookupList.shift();

		postData = postData + "<name>" + "<![CDATA[" + lookupValueName + "]]>"
				+ "</name>";

		nlapiLogExecution('DEBUG', 'Name in Payload = ', lookupValueName);
		if (currentType == 'account') {
			postData = postData + "<external-ref-num>"
					+ record.getFieldValue('acctnumber')
					+ "</external-ref-num>";

			postData = postData + "<external-ref-code>"
					+ record.getFieldValue('acctnumber')
					+ "</external-ref-code>";
		} else {
			postData = postData + "<external-ref-num>" + nlapiGetRecordId()
					+ "</external-ref-num>";

			postData = postData + "<external-ref-code>" + nlapiGetRecordId()
					+ "</external-ref-code>";
		}
		postToCoupa(postData, lookupList[0], url, headers, type, recordName,accntNumber);

	} // try statement

	catch (error) {
		if (error instanceof nlobjError) {
			nlapiLogExecution('ERROR', 'Process Error In Try!', 'Error Code = '
					+ error.getCode() + 'Error Detail ' + error.getDetails());
			nlapiSendEmail(-5, nlapiGetContext().getSetting('SCRIPT',
					'custscript_coupa_accs_notify_email'),
					+'Dynamic Account Integration:Processing Error',
					'Error Code = ' + error.getCode() + ' Error Description = '
							+ error.getDetails());
		} else {
			nlapiLogExecution('ERROR', 'Process Error In Try!', 'Error = '
					+ error);
			nlapiSendEmail(-5, nlapiGetContext().getSetting('SCRIPT',
					'custscript_coupa_accs_notify_email'),
					+'Dynamic Account Integration:Processing Error', 'Error = '
							+ error);
		}
	}

}

/**
 * Returns a 2 element array of the value name and the lookups it applies to.
 * The first element is the hierarchical (or not for subsidiaries) name. The
 * second is an array of all of the subsidiaries this record applies to, minus
 * the ones that are not included in Coupa
 * 
 * @param recID
 * @param recType
 * @returns {Array} subList [name of the record, [lookup1name,lookup2name,...]]
 */
function getLookupList(recID, recType) {
	var subList = getSearchResults(recID, recType);
	var subArray = subList[1];
	var prefix = "_";
	if (recType == 'account') {
		prefix = 'acct_';
	}
	if (recType == 'department') {
		prefix = 'dept_';
	}
	if (recType == 'classification') {
		prefix = 'clas_';
	}
	if (recType == 'location') {
		prefix = 'locn_';
	}
	if (recType == 'subsidiary') {
		prefix = 'subs_';

		subArray = prefix + subArray;

		subList[1] = subArray;
		return subList;
	}
	if (nlapiGetContext().getSetting('SCRIPT','custscript_coupa_accs_one_subsidiary') == 'T') {
		subArray = prefix + subArray;
		subList[1] = subArray;
		return subList;
	}

	// Search for subsidiaries not included in Coupa, and remove subsidiaries
	// from lookupList that are in this set
	var subcustincludeonly = nlapiGetContext().getSetting('SCRIPT','custscript_coupa_accs_dynamic_sub_includ');
	var inCoupaFilter = new Array();
	inCoupaFilter[0] = new nlobjSearchFilter(subcustincludeonly, null, 'is','T');
	var subColumn = new nlobjSearchColumn('namenohierarchy');
	var resultList = nlapiSearchRecord('subsidiary', null, inCoupaFilter,subColumn);
	var coupaInclude = new Array();
	for ( var element in resultList) {
		coupaInclude.push(resultList[element].getValue('namenohierarchy'));
	}
	subArray = coupaInclude.filter(function(x) {
		if (subArray.indexOf(x + ", ") > -1) {
			return true;
		} else if (subArray.indexOf(", " + x) > -1) {
			return true;
		} else if (typeof (subArray) == 'string') {
			return subArray == x;
		} else {
			return false;
		}
	});

	for (var i = 0; i < subArray.length; i++) {
		subArray[i] = prefix + subArray[i];
	}

	subList[1] = subArray;
	return subList;
}

/**
 * Returns a 2 element array of the record and the subsidiaries. The first
 * element is the hierarchical (or not for subsidiaries) name. The second is a
 * string of all of the subsidiaries this record applies to separated by commas.
 * 
 * @param id
 * @param type
 * @returns {Array} [name of the record, "subsidiary1, subsidiary2,..."]
 */
function getSearchResults(id, type) {

	if (nlapiGetContext().getSetting('SCRIPT',
			'custscript_coupa_accs_one_subsidiary') == 'T') {
		var companyName = nlapiGetContext().getSetting('SCRIPT',
				'custscript_coupa_accs_lookup_name');
		var record = nlapiLoadRecord(type, id);
		var recordName = '';
		if (type == 'account') {
			recordName = record.getFieldValue('acctname');
		} else {
			recordName = record.getFieldValue('name');
		}
		return [ recordName, companyName ];
	}
	// Filter on internalID, always returns one result, and gives us name with
	// hierarchy. Name saved in in sub[0]
	var idFilter = new nlobjSearchFilter('internalid', null, 'is', id);

	if (type == 'account') {
		// Account does not return a comma delimited column, instead giving a
		// series of rows. Need to change to a comma separated list to match
		// others

		// Subsidiary result column must be no hierarchy
		var subList = "";
		var searchResults = nlapiSearchRecord('account',
				'customsearch_coupa_accs_accsearch', idFilter, null);
		var accName = searchResults[0].getValue('name');

		for ( var result in searchResults) {
			var sub = searchResults[result].getText('subsidiarynohierarchy');
			subList = subList + sub + ', ';
		}
		subList = subList.slice(0, -2);
		nlapiLogExecution('AUDIT', 'Subsidiary found: ', subList.toString()
				+ ' for ' + type + ': ' + accName);
		return [ accName, subList ];
	}

	if (type == 'department') {
		var searchResults = nlapiSearchRecord('department',
				'customsearch_coupa_accs_deptsearch', idFilter, null);
		var sub = searchResults[0].getValue('subsidiary');
		var deptHierarchicalName = searchResults[0].getValue('name');
		if(sub.indexOf('More..') > -1) {
			sub = parentSubsidiarySearch(type, deptHierarchicalName, id);
		}
		nlapiLogExecution('AUDIT', 'Subsidiary found: ', sub + ' for ' + type
				+ ': ' + deptHierarchicalName);
		
		return [ deptHierarchicalName, sub ];
	}

	if (type == 'classification') {
		var searchResults = nlapiSearchRecord('classification',
				'customsearch_coupa_accs_classsearch', idFilter, null);
		var sub = searchResults[0].getValue('subsidiary');
		var classHierarchicalName = searchResults[0].getValue('name');
		if(sub.indexOf('More..') > -1) {
			sub = parentSubsidiarySearch(type, classHierarchicalName, id);
		}
		nlapiLogExecution('AUDIT', 'Subsidiary found: ', sub + ' for ' + type
				+ ': ' + classHierarchicalName);
		return [ classHierarchicalName, sub ];
	}

	if (type == 'location') {
		var searchResults = nlapiSearchRecord('location',
				'customsearch_coupa_accs_locsearch', idFilter, null);
		var sub = searchResults[0].getValue('subsidiary');
		var locHierarchicalName = searchResults[0].getValue('name');
		if(sub.indexOf('More..') > -1) {
			sub = parentSubsidiarySearch(type, locHierarchicalName, id);
		}
		nlapiLogExecution('AUDIT', 'Subsidiary found: ', sub + ' for ' + type
				+ ': ' + locHierarchicalName);
		return [ locHierarchicalName, sub ];
	}

	if (type == 'subsidiary') {
		var searchResults = nlapiSearchRecord('subsidiary',
				'customsearch_coupa_accs_subsearch', idFilter, null);
		var subName = searchResults[0].getValue('namenohierarchy');
		nlapiLogExecution('AUDIT', 'Subsidiary found: ', subName + ' for '
				+ type + ': ' + subName);
		return [ subName, subName ];
	}
}

function parentSubsidiarySearch(type, name, objectId) {
	
	var record = nlapiLoadRecord(type,objectId);
	var parentId = record.getFieldValue('subsidiary');
	var idFilter = new Array();
	idFilter[0] = new nlobjSearchFilter('parent', null, 'is', parentId);
	var column = new nlobjSearchColumn('namenohierarchy');
	var subList = "";
	var subs = nlapiSearchRecord('subsidiary', null, idFilter, column);
	for ( var result in subs) {
		var sub = subs[result].getValue('namenohierarchy');
		subList = subList + sub + ', ';
	}
	subList = subList.slice(0, -2);
	//nlapiLogExecution('AUDIT', 'Subsidiary found: ', subList.toString()
		//	+ ' for ' + type + ': ' + name);
	return subList;
}

/**
 * Posts the payload to Coupa, using the given headers, and url. Builds the
 * <lookup><name></name></lookup></lookup-value> for each element in
 * lookups. If the record type is an edit it will make an API call to Coupa
 * checking for a lookupValue where the lookupName matches, and the
 * externalRefNumber.
 * 
 * @param payload
 * @param lookups
 * @param url
 * @param headers
 * @param type
 * @param name
 */
function postToCoupa(payload, lookups, url, headers, type, name, glNum) {
	for (var i = 0; i < lookups.length; i++) {
		var lookup_name = "";
		if (typeof (lookups) == 'string') {
			lookup_name = lookups;
			i = lookups.length;
		} else {
			lookup_name = lookups[i];
		}
		var partialPayload = payload;
		partialPayload = partialPayload + "<lookup><name>" + lookup_name
				+ "</name></lookup>";
		partialPayload = partialPayload + "</lookup-value>";
		var existsInCoupa = false;
		var coupaLookupValueId = "";
		var lookupName = lookup_name;
		if (type == 'edit' || type == 'delete') {
			var getResponse = '';
			var GETurl = url + '?external-ref-num=' + nlapiGetRecordId()
					+ '&[lookup][name]=' + lookupName.replace(/ /g, '%20');
			if (lookupName.indexOf('acct_') > -1) {
				GETurl = url + '?external-ref-num=' + glNum
						+ '&[lookup][name]=' + lookupName.replace(/ /g, '%20');
			}
			nlapiLogExecution('DEBUG', 'Type is an edit, GETurl is = ', GETurl);
			getResponse = nlapiRequestURL(GETurl, null, headers, 'GET');
			nlapiLogExecution('DEBUG', 'GETurl response code is = ',getResponse.getCode());
			if (getResponse.getCode() == '200') {
				existsInCoupa = true;
				var responseXML = nlapiStringToXML(getResponse.getBody());
				coupaLookupValueId = nlapiSelectValue(responseXML,'lookup-values/lookup-value/id');
				nlapiLogExecution('DEBUG', 'LookupValue ID is = ', coupaLookupValueId);
			} else {
				nlapiLogExecution("DEBUG", "Failure to retrieve lookupvalue","Response Code: " + getResponse.getCode()+ " Body response: " + getResponse.getBody());
			}
		}

		if (existsInCoupa) {
			var PUTurl = url + "/" + coupaLookupValueId;
			var response = nlapiRequestURL(PUTurl, partialPayload, headers,
					'PUT');

			nlapiLogExecution('DEBUG', 'within PUT url = ', PUTurl);

			if (response.getCode() != '200') {
				nlapiLogExecution('ERROR', 'Processing Error with updating',
						'Lookup Value Coupa ID: ' + coupaLookupValueId
								+ ' Name: ' + name + '. Error: '
								+ response.getBody());
			} else {
				nlapiLogExecution('AUDIT', 'Successfully updated Lookup Value',
						'ID: ' + coupaLookupValueId);
			}
		}

		else {
			var response = nlapiRequestURL(url, partialPayload, headers, 'POST');
			if (response.getCode() != '201') {
				nlapiLogExecution('ERROR',
						'Processing Error with creating Lookup Value', 'Name: '
								+ name + ' for Lookup: ' + lookupName
								+ '. Error: ' + response.getBody());
			} else {
				nlapiLogExecution('AUDIT', 'Successfully created Lookup Value',
						'Name: ' + name + ' for Lookup: ' + lookupName);
			}
		}
	}
	if (lookups.length == 0) {
		nlapiLogExecution('ERROR', 'LookupValue not created',
				'No subsidiaries included in Coupa for ' + type + ' ' + name);
	}
}