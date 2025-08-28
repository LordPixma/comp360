-- SOC 2 Lite Controls
INSERT INTO controls (id, pack, ref, title, guidance) VALUES
('soc2-cc1-1', 'soc2_lite', 'CC1.1', 'Security Program Charter', 
 'Establish and maintain a security program charter that defines organizational commitment, scope, roles, and responsibilities for information security.'),
('soc2-cc1-3', 'soc2_lite', 'CC1.3', 'Roles & Responsibilities',
 'Define and document roles and responsibilities for information security across the organization.'),
('soc2-cc6-3', 'soc2_lite', 'CC6.3', 'Logical Access',
 'Implement logical access controls including multi-factor authentication and least privilege principles.'),
('soc2-cc6-6', 'soc2_lite', 'CC6.6', 'Change Management',
 'Establish change management procedures including code reviews and testing before production deployment.'),
('soc2-cc7-2', 'soc2_lite', 'CC7.2', 'System Monitoring',
 'Monitor systems for security events, availability, and processing integrity.'),
('soc2-cc8-1', 'soc2_lite', 'CC8.1', 'Confidentiality Commitments',
 'Identify and protect confidential information throughout its lifecycle.');

-- ISO 27001 Core Controls
INSERT INTO controls (id, pack, ref, title, guidance) VALUES
('iso-a5-1', 'iso_core', 'A.5.1', 'Information Security Policies',
 'Establish, approve, publish, communicate and review information security policies.'),
('iso-a6-1', 'iso_core', 'A.6.1', 'Internal Organization',
 'Define and allocate information security responsibilities.'),
('iso-a8-1', 'iso_core', 'A.8.1', 'Asset Management',
 'Identify organizational assets and define appropriate protection responsibilities.'),
('iso-a9-1', 'iso_core', 'A.9.1', 'Access Control Policy',
 'Establish an access control policy based on business and security requirements.');

-- GDPR Baseline Controls
INSERT INTO controls (id, pack, ref, title, guidance) VALUES
('gdpr-art-30', 'gdpr_baseline', 'Art.30', 'Records of Processing',
 'Maintain records of processing activities under your responsibility.'),
('gdpr-art-32', 'gdpr_baseline', 'Art.32', 'Security of Processing',
 'Implement appropriate technical and organizational measures to ensure security.'),
('gdpr-art-33', 'gdpr_baseline', 'Art.33', 'Breach Notification',
 'Notify personal data breaches to supervisory authority within 72 hours.'),
('gdpr-art-35', 'gdpr_baseline', 'Art.35', 'Data Protection Impact Assessment',
 'Conduct DPIA where processing is likely to result in high risk to rights and freedoms.');