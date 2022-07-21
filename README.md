# `amazon-codeguru-reviewer-github-actions-shift-left-example`

This is a repository that contains a technical deep dive demo for the *Amazon CodeGuru Reviewer* and *Profiler* used during a talk titled *"Build your path towards the next gen DevOps by applying AI/ML services"* in *AWS Summit Berlin 2022*, and also in the *BuildOn.AWS* article titled: *"Shift Left! A story on how to avoid security issues by using the cloud services"*.

## Prerequisites

- Pre-installed tools:
  - Most recent *AWS CLI*.
  - Most recent *AWS SAM*.
  - *AWS CDK* in version 2.x or higher.
  - Python 3.8 or higher.
  - OpenJDK 11 or higher (ideally *Amazon Corretto* 11.x).
  - Gradle 7.x or higher.
  - Node.js v16.x or higher.
- Configured profile in the installed *AWS CLI* for your *AWS IAM* User account of choice.

## Disclaimer

This code interacts with *GitHub Actions API* which has terms published at [terms and conditions page](https://docs.github.com/en/site-policy/github-terms/github-terms-for-additional-products-and-features) and pricing described at [this page](https://docs.github.com/en/billing/managing-billing-for-github-actions/about-billing-for-github-actions). You should be familiar with the pricing and confirm that your use case complies with the terms before proceeding.

## How to use that repository?

```shell
# After checking out the repository - do it in a single terminal session ...

$ make
$ source ./.env/bin/activate

$ cd services
$ make

$ cd ../infrastructure
$ npm install

$ export GITHUB_ORG_NAME=<YOUR_GITHUB_ORG_NAME>
$ export GITHUB_REPO_NAME=<YOUR_GITHUB_REPOSITORY_NAME>
$ export AWS_USERNAME=<YOUR_IAM_USERNAME>
$ export AWS_DEFAULT_PROFILE=<YOUR_PROFILE_FROM_AWS_CLI>

$ cdk bootstrap
$ npm run package

$ npm run deploy-shared-infrastructure
# Now you can configure necessary secrets for the GitHub Actions inside your forked repository.

$ npm run deploy
```

From now on everything can be done from the *AWS Cloud9* that is set up by the *infrastructure as code* used above.

If you are interested in getting relevant slides, or you have more questions [feel free to contact me directly](https://awsmaniac.com/contact).

## History

- Presented at *AWS Summit Berlin 2022*: [Build your path towards the next gen DevOps by applying AI/ML services](https://aws.amazon.com/events/summits/berlin/agenda/?berlin-summit-agenda-card.sort-by=item.additionalFields.headline&berlin-summit-agenda-card.sort-order=asc&awsf.berlin-summit-agenda-day=*all&awsf.berlin-summit-agenda-language=*all&awsf.berlin-summit-agenda-persona=*all&awsf.berlin-summit-agenda-level=*all&awsf.berlin-summit-agenda-segment=*all&awsf.berlin-summit-agenda-topic=*all&awsf.berlin-summit-agenda-industry=*all&berlin-summit-agenda-card.q=MAD201&berlin-summit-agenda-card.q_operator=AND) (*MAD201*).
- Article on [BuildOn.AWS](https://blog.buildon.aws/posts/) blog: [Shift Left! A story on how to avoid security issues by using the cloud services](https://blog.buildon.aws/posts/shift-left-a-story-on-how-to-avoid-security-issues-by-using-the-cloud-services/) article.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the *MIT-0 License*. See the [LICENSE](LICENSE) file.
