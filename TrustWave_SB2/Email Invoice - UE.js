function beforeLoad_print(type, form, request){

      if (type == "view"){

          form.addButton('custpage_print1', 'Email Invoice', 'testprint()');
          form.setScript('customscript_invoice_email1'); // this is the value of the User Event script's ID 
      } 
}

function testprint(type){

     var suiteletURL = 'https://system.na2.netsuite.com'+ nlapiResolveURL('SUITELET', 682, 1)+'&custparam_recid='+nlapiGetRecordId(); 
	 //scriptid and deploymentid will depend on the Suitelet that will be created below
    window.open(suiteletURL);

}