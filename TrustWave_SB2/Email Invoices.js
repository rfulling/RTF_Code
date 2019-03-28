function scheduled(type){
	
	/*var search  = nlapiLoadSearch('invoice', 'customsearch_monthly_fcp');
	nlapiLogExecution('DEBUG', 'Running Saved Search');
	var resultSet = search.runSearch();
	var results = resultSet.getResults(0,1);
	var columns = results[0].getAllColumns();
	nlapiLogExecution('DEBUG', 'Running Saved Search 3');
	columns[0] = new nlobjSearchColumn('internalid');	
	columns[1] = new nlobjSearchColumn('custbody_to_email');	
	*/
	
	var results = nlapiSearchRecord('invoice', 2289, null, null);
	
	//if no results
	if (!results)
				{
					nlapiLogExecution('DEBUG', 'No Invoices to Be Emailed');	
				}
				
	//if results
	if (results) {
		nlapiLogExecution('AUDIT', 'Processing ' + results.length + ' Invoices to be Emailed');
		//loop for number of invoices to be processed	
		for (var k = 0; k < results.length; k++)
			{
			
				var usage = nlapiGetContext().getRemainingUsage();

				// If the script's remaining usage points are bellow 1,000 ...       
				if (usage < 1000) 
				{
				// ...yield the script samuelooi@mohg.com
				var state = nlapiYieldScript();
				// Throw an error or log the yield results
				if (state.status == 'FAILURE')
				throw "Failed to yield script";
				else if (state.status == 'RESUME')
				nlapiLogExecution('DEBUG','Resuming script');   
				
				}
				//Internal ID
				var internalId = results[k].getValue('internalid');	
				nlapiLogExecution('DEBUG', 'Internal ID: ', internalId);					
				//To be Emailed
				var toEmail = results[k].getValue('custbody_to_email');	
				nlapiLogExecution('DEBUG', 'Emails: ', toEmail);	
				
				var tranid = results[k].getValue('tranid');	
				nlapiLogExecution('DEBUG', 'Emails: ', tranid);	
				
				
				var record = nlapiLoadRecord('invoice', internalId);
				var file = nlapiPrintRecord('TRANSACTION', internalId, 'PDF',null); 
	 
				//this will allow you to define the template that will be used to print the invoice
				//response.setContentType('PDF', 'Print Invoice Record', 'INLINE');
				//response.write(file.getValue());
				var emailTempId = 5; // internal id of the email template
				var emailTemp = nlapiLoadRecord('emailtemplate',emailTempId); 
				var emailSubj = emailTemp.getFieldValue('subject');
				var emailBody = emailTemp.getFieldValue('content');	  
				var records = new Array();
				records['transaction'] = nlapiGetRecordId(); //internal id of Transaction
				nlapiLogExecution('DEBUG', 'To Email', toEmail);	
				
				if (!toEmail)
				{
					nlapiSendEmail(
						23779,23779,'Error Sending Email','Error Sending Email for 15th - Sports Clip Monthly FCP. Please Enter To Email Address for Invoice: ' + tranid);
				}
				
				if (toEmail)
				{
				var cc = [];
				toEmail = toEmail.split(',');
				for (var x = 0; x<toEmail.length; x++){
				cc[x] = toEmail[x];
				}
	  
				var renderer = nlapiCreateTemplateRenderer();
				renderer.addRecord('transaction', record);
				nlapiLogExecution('DEBUG', 'Internal ID of Invoice To Email', internalId);	
				renderer.setTemplate(emailSubj);	 
				renderSubj = renderer.renderToString();
				renderer.setTemplate(emailBody);
				renderBody = renderer.renderToString();
				nlapiSendEmail(23779, cc, renderSubj, renderBody, null, null, records, file);
				nlapiLogExecution('DEBUG', 'Email successfully Sent');	  
				}
			}
		}
}
