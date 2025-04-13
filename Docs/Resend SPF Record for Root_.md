# **Configuring SPF TXT Records for Root Domains When Using Resend**

**1\. Introduction to SPF and Email Authentication**

Sender Policy Framework (SPF) is a fundamental email authentication standard designed to combat email spoofing, a common tactic used in phishing and spam campaigns.1 It functions by enabling domain owners to explicitly specify which mail servers are authorized to send emails on behalf of their domain.1 This is achieved through the publication of SPF records in the Domain Name System (DNS). When a receiving mail server receives an email, it can check the SPF record of the sending domain to verify if the email originated from an authorized server.1

The proper implementation of SPF is crucial for enhancing email deliverability and safeguarding the sender's reputation.1 By authenticating outgoing emails, domain owners increase the likelihood that their messages will reach the intended recipients' inboxes rather than being flagged as spam. Furthermore, SPF serves as a foundational layer for other advanced email authentication mechanisms, such as DomainKeys Identified Mail (DKIM) and Domain-based Message Authentication, Reporting, and Conformance (DMARC), which together provide a robust defense against email-based threats.1 The consistent emphasis on SPF alongside DKIM and DMARC underscores its fundamental role in establishing a comprehensive email security strategy. This layered approach to authentication is essential for minimizing the risk of email spoofing and improving overall email ecosystem trust.

An SPF record is implemented as a TXT (Text) record within the DNS zone of a domain.3 This record typically starts with the version identifier v=spf1, followed by various mechanisms that define the authorized sending sources.3 One such mechanism is include:, which allows the current domain's SPF policy to incorporate the SPF records of other specified domains.3 This is particularly useful when utilizing third-party email sending services. Finally, the SPF record concludes with an all mechanism, which specifies how receiving mail servers should handle emails that do not match any of the preceding mechanisms. Common qualifiers used with the all mechanism include \~all (SoftFail), indicating that emails failing the SPF check should be accepted but marked as suspicious, and \-all (HardFail), suggesting that such emails should be rejected.3 Understanding the syntax and function of these components is essential for correctly configuring SPF records.

**2\. Resend's Approach to Email Sending and Domain Verification**

Resend, as an email API service, mandates that users verify ownership of their sending domains.1 This verification process is a standard security measure employed by reputable email service providers to ensure the legitimacy of senders and maintain high deliverability rates across their platform.1 By verifying domain ownership, Resend helps prevent unauthorized use of domains for malicious purposes, thereby protecting both senders and recipients.

The domain verification process on Resend primarily relies on the configuration of specific DNS records, including SPF (as a TXT record) and DKIM (also as a TXT record), with DMARC being an optional but recommended addition.1 These DNS records serve as verifiable proof that the user has control over the domain they intend to use for sending emails. The consistent emphasis on domain verification highlights its critical importance for utilizing Resend's services effectively and securely. This requirement demonstrates Resend's commitment to fostering a trustworthy email sending environment for all its users.

While Resend supports sending emails from both root domains (e.g., yourdomain.com) and subdomains (e.g., updates.yourdomain.com), the platform explicitly recommends utilizing subdomains as a best practice.1 The primary rationale behind this recommendation is to facilitate better segmentation of sending reputation.1 By using separate subdomains for different types of email communication, such as transactional emails and marketing campaigns, senders can isolate their reputation for each category. This prevents potential deliverability issues with one type of email from negatively impacting the other. However, the user's specific inquiry regarding SPF record configuration for a root domain indicates a need for this particular setup, and the documentation does provide guidance for this scenario.

For the purpose of domain verification, Resend typically requires the configuration of three main types of DNS records: MX, SPF (TXT), and DKIM (TXT).1 The MX record (Mail Exchanger) is essential for receiving emails at the domain. The SPF record, as discussed, specifies authorized sending servers. DKIM (DomainKeys Identified Mail) adds a digital signature to email headers, allowing recipient servers to verify the email's authenticity and integrity.1 While the user's primary focus is on the SPF TXT record, it is important to acknowledge that a complete domain verification setup involves these multiple DNS record types, contributing to a robust email authentication framework.

**3\. Locating SPF Record Information in Resend's Documentation**

Information regarding the setup of SPF records for email sending with Resend can be found throughout their official documentation. By searching for terms such as "SPF record," "root domain," and "Resend documentation," relevant sections detailing the necessary configurations can be identified. Multiple snippets within the provided research material explicitly address SPF record configuration in the context of using Resend.11

The presence of numerous guides specifically tailored to different DNS providers, including Cloudflare, Vercel, Namecheap, and Route 53, suggests a consistent underlying SPF record value required for Resend across these platforms.11 This consistency simplifies the configuration process for users regardless of their domain hosting provider and increases confidence in identifying the correct SPF record components. The fact that Resend offers provider-specific instructions indicates a user-centric approach, aiming to make the domain verification process as straightforward as possible.

**4\. Analysis of Resend's Recommended SPF TXT Record for Root Domains**

**Identify the include: value:**

An examination of the provided snippets, particularly those detailing SPF record setup for various DNS providers 11, reveals a consistent include: value within the recommended SPF record. This value is uniformly specified as include:amazonses.com. The repeated appearance of this specific include: directive strongly suggests that Resend utilizes Amazon Simple Email Service (SES) as its underlying infrastructure for sending emails. By including amazonses.com in their SPF records, Resend users authorize Amazon's SES servers to send emails on their behalf, which is a fundamental requirement for proper SPF authentication when using Resend's services.

**Determine the recommended all qualifier:**

Analyzing the SPF record examples provided in the same set of snippets 11 also reveals a consistent recommendation for the all qualifier. In all instances, the qualifier used with the all mechanism is \~all, which signifies a SoftFail. This consistent recommendation indicates that Resend advises a less strict SPF policy. A SoftFail instructs receiving mail servers to accept emails that fail the SPF check but to mark them as potentially suspicious, typically by placing them in the spam folder. This approach might be preferred by Resend to minimize the risk of legitimate emails being rejected outright due to transient DNS issues or other temporary factors. While a HardFail (-all) offers stronger protection against spoofing by instructing receiving servers to reject non-compliant emails, a SoftFail provides a balance between security and deliverability.

**SMTP vs. API for Root Domains:**

A review of the research snippets does not indicate any differentiation in the recommended SPF record based on the method used to send emails (SMTP or API) from a root domain. While snippet 9 mentions Resend's support for sending emails via SMTP, it does not provide a distinct SPF record configuration for this method compared to using the API. The consistent use of include:amazonses.com \~all across the documentation, regardless of the specific setup guide (e.g., Cloudflare, Vercel), suggests that the SPF record requirement for a root domain remains the same whether emails are sent through Resend's API or via SMTP. This uniformity simplifies the DNS configuration process for users, as they do not need to implement different SPF records based on their chosen sending method. Given that both SMTP and API ultimately leverage Resend's underlying infrastructure for email transmission, it is logical that the SPF authorization would be consistent, as it pertains to the authorized sending servers rather than the specific protocol used to submit the email to Resend.

**5\. Specific Considerations and Best Practices for Root Domains**

Resend's documentation consistently advises users to utilize subdomains (e.g., updates.yourdomain.com) instead of their root domain for sending emails.1 This recommendation is primarily driven by the benefits of better reputation management.1 By separating email traffic based on purpose (e.g., transactional, marketing) onto distinct subdomains, senders can prevent potential deliverability issues with one type of email from affecting the others. This granular approach to reputation management helps ensure that important transactional emails, for instance, are not impacted by the sending patterns or recipient engagement with marketing emails. While the user's query specifically addresses the configuration for a root domain, it is important to acknowledge Resend's general best practice recommendation.

When configuring the SPF record for a root domain, the "Host" or "Name" field in the DNS settings should typically be entered as @ or left empty, depending on the specific interface of the DNS provider.12 This convention signifies that the DNS record applies directly to the root domain itself, rather than a subdomain. Instructions provided for specific DNS providers, such as Google Domains, general guidelines, GoDaddy, and Cloudflare, all corroborate this practice.12 This detail is crucial for ensuring that the SPF record is correctly associated with the root domain and is properly queried by receiving mail servers during SPF authentication checks.

It is essential to ensure that the SPF record is added as a TXT record within the domain's DNS settings.1 SPF records must be published in this format for receiving mail servers to correctly interpret and utilize them for authentication. Using the wrong DNS record type will result in the SPF policy not being recognized, thereby negating its intended benefits for email deliverability and security.

Furthermore, when configuring the SPF record for the root domain, it is generally necessary to omit the domain name itself from the "Name" field.11 For example, if the domain is yourdomain.com, the "Name" field should simply be @ or left blank, while the "Value" field will contain the actual SPF record string. This practice avoids redundancy and ensures that the DNS record is correctly formatted for the root domain. This is a common point of confusion for users setting up DNS records, and clarifying this aspect helps prevent potential configuration errors.

**6\. Summary of Findings and Recommended SPF Record**

Based on the analysis of Resend's official documentation, the required include: value for the SPF record of a root domain when using their services is include:amazonses.com. The recommended qualifier for the all mechanism is \~all (SoftFail).

Therefore, the complete recommended SPF TXT record value for a root domain (e.g., yourdomain.com) when sending emails via Resend's SMTP or API is:

"v=spf1 include:amazonses.com \~all"

This record should be added as a TXT record in the DNS settings for the root domain. The "Host" or "Name" field for this record should be set to @ or left empty, depending on the DNS provider's interface.

**7\. Recommendations for Implementation and Testing**

To implement the recommended SPF record, the user should access their domain's DNS management interface, typically provided by their domain registrar or hosting provider. A new TXT record should be added with the following details:

| Field | Value |
| :---- | :---- |
| Record Type | TXT |
| Host/Name | @ or (Leave Empty) |
| Value | "v=spf1 include:amazonses.com \~all" |

After saving the DNS record, it is crucial to allow sufficient time for DNS propagation. While Resend indicates that domain verification usually occurs within 15 minutes 10, DNS changes can sometimes take up to 24-48 hours to propagate fully across the internet.16

To verify that the SPF record has been published correctly, the user can utilize various DNS lookup tools available online or through command-line interfaces (e.g., nslookup or dig). These tools allow querying the DNS records associated with a domain and confirming the presence and content of the newly added SPF TXT record.10

It is also recommended to send a test email from the root domain via Resend to an external email address (preferably one on a different email provider) and examine the email headers. The headers should indicate whether the SPF check passed or failed. A "pass" result confirms that the SPF record is correctly configured and that receiving mail servers are authenticating emails sent through Resend on behalf of the domain.5

Finally, while this report provides the SPF record configuration for a root domain as requested, it is important to reiterate Resend's best practice recommendation to utilize subdomains for sending emails whenever possible.1 This practice can lead to improved email deliverability and better management of sender reputation.

**Conclusion**

Configuring the correct SPF TXT record is a vital step in ensuring email deliverability and protecting a domain's reputation when using Resend. For sending emails from a root domain, the official Resend documentation indicates that the appropriate SPF record value is "v=spf1 include:amazonses.com \~all". This record authorizes Resend's sending infrastructure (via Amazon SES) to send emails on behalf of the domain and advises receiving servers to treat emails failing this check as a SoftFail. While Resend recommends using subdomains for enhanced reputation management, this report provides the necessary information for configuring SPF for a root domain, enabling users to send authenticated emails and improve their overall email deliverability.