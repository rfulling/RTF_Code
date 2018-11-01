function setCurrentUser(type){
 
   if (type == 'copy'){

      nlapiSetFieldValue('custbodytwh_created_by', nlapiGetContext().user); //This is the Custom Field "Created By"
      nlapiLogExecution('DEBUG', 'Set Current User - Client Script');

   }

}