
var domain = "bank.local.fr"

/**
 * @description Fetch transactions recursively
 * @param {string} fromDate The maximum date of transactions to return
 * @param {string} authorization Authorization header to authent the user
 * @param {jws} jws Jws token, mandatory if we get one from login request // R: ???
 * @param {Number} id Account id
 * @param {Number} page Number of the page
 * @param {Object} previousTransactions Previous page of transactions (To ckeck for dupes) // R: Misspelling of 'check'. Duplicates*?
 * @return {Object} All transactions available on the page
 */
async function fetchTransactions(fromDate, authorization, jws = null, id, page, previousTransactions) {
	console.log(`--- Fetch Trasactions page n°${page} ---`);
	try {
    var headers = {"Authorisation":  authorization } // R: Use let instead of var, Authorization misspelled

    if (jws) { // R: refactor this to add the 'jws' property, if present, after the declaration of headers
      headers = {
        "Authorisation": authorization, // R: Authorization misspelled
        "jws": jws,
        "Content-type": "application/json",
        "Accept": "application/json"
      }
    } else {
      headers = {
        "Authorisation": authorization, // R: Authorization misspelled
        "Content-type": "application/json",
        "Accept": "application/json",
      }
    }

	  var {code, response } = await doRequest('GET', // R: Use let instead of var. Bad indentation (space after '{')
      domain + '/accounts/'+ id + '/transactions?' + `page=${page}`, // R: Why not use string interpolation for the entire string?
      headers);


		if (response && code == 200 && response.data) {
      if (response.data.meta) {
        if (response.data.meta.hasPageSuivante) { // R: You can merge all these ifs into one
          let mouvements = response.data.Mouvements;
          var date = mouvements[mouvements.length -1].dateValeur; // R: Use let instead of var. Bad indentation (space after '-')
          if (date <= fromDate) {
            console.log("FromDate is Reached - we don't need more transaction"); // R: transactions*
          } else {
            // if we have mouvements
            if (mouvements) {
              if (assertTransactions(mouvements)) {
                return [];
              } else {
                console.log(`Push transactions from page ${page}`);
              }
            } else {
              throw new Error("Empty list of transactions ! " + JSON.stringify(previousTransactions));
            }
            let nextPagesTransactions = fetchTransactions(fromDate, authorization, (jws || null), id, page + 1, mouvements); // R: (jws || null) could be replaced by 'jws'
            response.data.Mouvements = mouvements.concat(nextPagesTransactions);
          }
        }
      }
      return response.data.Mouvements;
    } else throw new Error();

    return []; // R: Dead code
	} catch (err) {
		throw new CustomError({
      function: 'fetchTransactions',
			statusCode: 'CRASH',
			rawError: e,
		});
	}
}
