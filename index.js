const core = require('@actions/core');
const github = require('@actions/github');
const request = require('request');

var githubToken = "";
var repoName = "";
var facebookToken = "";
var facebookGroupId = "";

/**
 * main
 */
async function main() {
  // 1. do http request to github to get release note generated by probot
  var response = await get_release_note(githubToken, repoName);

  var release_note;
  var is_draft;
  var subject;
  var prettyName = to_title_case(repoName);

  if (!!response == true && Array.isArray(response) == true) {
    release_note = response[0];
  }
  else if (!!response == true && Array.isArray(response) == false) {
    release_note = response;
  }

  is_draft = (!!release_note == true && release_note.draft == true);
  subject = is_draft == true ? `${prettyName} Staging Release ${release_note.tag_name}` : `${prettyName} Production Release ${release_note.tag_name}`;

  // 2. push facebook post
  var facebook_response = await send_facebook_post(facebookToken, facebookGroupId, subject, release_note.body);
  facebook_response.sta
}

/**
 * send the workplace post
 * @param facebook_releases_token facebook Bearer Authentication i.e. Bearer Eixeijswifillslsleihomcn2s5
 * @param subject
 * @param facebook_group_id
 * @param body_md the release note markdown to be sent
 */
async function send_facebook_post(facebook_releases_token, facebook_group_id, subject, body_md) {

  var payload = `# ${subject} \n ${body_md}`
  var options = {
    url: `https://graph.facebook.com/${facebook_group_id}/feed?formatting=MARKDOWN&message=${encodeURIComponent(payload)}`,
    headers: {
      'Authorization': `Bearer ${facebook_releases_token}`
    },
  };

  var response = await new Promise(function (resolve, reject) {
    request.post(options, function (error, response, body) {
      if (error) {
        reject(error);
        throw "Error posting facebook post";
      }
      else
        resolve(response);
    });
  });

  return response;
}

/**
* fetch release note via github api
* @param github_releases_token github Basic Authentication i.e. Basic username:password
* @param repo_name the name of the repo for which to get latest release note
*/
async function get_release_note(github_releases_token, repo_name) {


  var options = {
    url: `https://api.github.com/repos/brafton/${repo_name}/releases`,
    headers: {
      'Authorization': `Bearer ${github_releases_token}`,
      'User-Agent': `${repo_name}`,
      // this ensure that the body of the response payload is html
      //'Accept': 'application/vnd.github.v3.html+json'
    },
  };

  var response = await new Promise(function (resolve, reject) {
    request.get(options, function (error, response, body) {
      if (error){
        reject(error);
        throw "Error getting releases";
      }
      else
        resolve(JSON.parse(body));
    });
  });

  return response;

}

function to_title_case(text) {
  var splitText = text.replace('-', ' ').replace('_', ' ');
  var arrayText = splitText.split(' ');
  var arrayTextToTitleCase = arrayText.map(x => x.charAt(0).toUpperCase() + x.substring(1));
  var prettyText = arrayTextToTitleCase.join(' ');
  return prettyText;
}


try {
  // pickup input parameters
  githubToken = core.getInput('github_token');
  repoName = core.getInput('repo_name');
  facebookToken = core.getInput('facebook_token');
  facebookGroupId = core.getInput('facebook_groupid');

  // log the params
  console.log(`Hello reponame=${repoName} token=${githubToken} facebookToken=${facebookToken} groupid=${facebookGroupId}`);

  // call the main function and do the work
  main().catch(error => core.setFailed(error.message));


} catch (error) {
  core.setFailed(error.message);
}
