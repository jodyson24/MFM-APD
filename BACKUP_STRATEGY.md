# MFM-APD Backup & Disaster Recovery Strategy

## Overview

This document defines the backup and disaster recovery procedures for the MFM Activities & Performance Dashboard (MFM-APD) system.

---

## 1. Data Classification

| Data Type | Criticality | RPO | RTO | Backup Frequency |
|-----------|-------------|-----|-----|------------------|
| MongoDB (users, activities, org units, etc.) | Critical | < 1 hour | < 4 hours | Continuous (Atlas) + Daily snapshots |
| Redis (cache, sessions) | Low | N/A | N/A | Not backed up (ephemeral) |
| File uploads (pictorial evidence) | High | < 24 hours | < 24 hours | Daily sync to object storage |
| Email templates | Medium | < 24 hours | < 24 hours | Version controlled (Git) |
| Configuration (.env, render.yaml) | High | < 24 hours | < 24 hours | Version controlled (Git) |

---

## 2. MongoDB Backup Strategy (Primary Data)

### 2.1 Atlas Automated Backups (Primary)
- **Provider**: MongoDB Atlas (current hosting)
- **Schedule**: Continuous backup with point-in-time recovery
- **Retention**: 7 days continuous, plus weekly snapshots for 4 weeks
- **Point-in-time Recovery**: 1-second granularity for last 24 hours
- **Cross-region Replication**: Enabled (configured in Atlas cluster)

### 2.2 Manual On-demand Snapshots
- **Trigger**: Before major deployments, schema migrations, or bulk data operations
- **Retention**: 90 days
- **Storage**: Separate Atlas project/cluster for isolation

### 2.3 Export Scripts (Supplementary)
```bash
# Daily export script (cron: 02:00 UTC)
# Location: scripts/backup/mongo-export.sh
# Output: Compressed JSON/CSV to cloud storage (S3/GCS/Azure Blob)

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
OUTPUT_DIR="/backups/mongo/$DATE"
mkdir -p "$OUTPUT_DIR"

# Export all collections
for coll in users activities orgunits activities activitytypes \
            activitycategories divisions strategicinitiatives \
            presentationcycles compliancerules compliancestatus \
            weeklymetrics weeklymetrictypes weeklyaggregates \
            metricsrollups users securitylogs presentationcycles; do
  mongoexport --uri="$MONGODB_URI" --collection="$coll" \
    --out="$OUTPUT_DIR/${coll}.json"
done

# Compress and upload
tar -czf "/backups/mongo_${DATE}.tar.gz" -C "$OUTPUT_DIR" .
aws s3 cp "/backups/mongo_${DATE}.tar.gz" "s3://mfm-apd-backups/mongo/" --storage-class GLACIER
```

---

## 3. File Uploads Backup (Pictorial Evidence)

### 3.1 Object Storage Sync
- **Primary**: Local `/uploads` directory served by Express static
- **Backup**: Daily sync to cloud object storage
- **Schedule**: Daily at 03:00 UTC
- **Retention**: 1 year (compliance requirement)

```bash
# Location: scripts/backup/upload-sync.sh
#!/bin/bash
aws s3 sync /app/uploads s3://mfm-apd-backups/uploads/ \
  --storage-class STANDARD_IA \
  --delete \
  --exclude "*.tmp" \
  --metadata-directive REPLACE
```

### 3.2 Integrity Verification
- **Monthly**: SHA256 checksum comparison between local and S3
- **Quarterly**: Full restore test from S3 to staging

---

## 4. Configuration & Code Backup

### 4.1 Git Repository (Primary)
- **Platform**: GitHub (private repository)
- **Branches**: `main` (production), `develop` (staging), feature branches
- **Protection**: Branch protection rules on `main` and `develop`
- **Secrets**: Stored in GitHub Secrets (not in repo)

### 4.2 Environment Configuration
- **Files**: `.env`, `.env.production`, `.env.example`, `render.yaml`
- **Backup**: Version controlled in Git
- **Secrets Rotation**: Quarterly (JWT secrets, API keys, DB passwords)

---

## 5. Redis Backup (Cache Only)

**Policy**: No backup required
- Redis stores only ephemeral cache data and session tokens
- Sessions can be re-established via login
- Cache rebuilds automatically from MongoDB on next request

---

## 5. Disaster Recovery Procedures

### 5.1 MongoDB Full Restore (RTO < 4 hours)

**Scenario**: Complete cluster failure or data corruption

1. **Assess Impact**: Determine scope (single collection vs entire cluster)
2. **Initiate Atlas Restore**:
   - Navigate to Atlas Dashboard → Backup → Restore
   - Select "Point in Time" → Choose timestamp before corruption
   - Target: New cluster or existing (if empty)
2. **Verify Data Integrity**:
   - Run `mongoexport` spot checks on critical collections
   - Verify document counts match pre-incident
3. **Update Application Config**:
   - Update `MONGODB_URI` in Render environment variables
   - Restart application pods
4. **Validate Application**:
   - Run smoke tests (health check, auth, key CRUD operations)
   - Notify stakeholders

### 5.2 Partial Collection Restore (RTO < 1 hour)

**Scenario**: Accidental deletion or corruption of specific collection

1. Use Atlas "Collection Level Restore" feature
2. Or use `mongoimport` from latest export backup
3. Verify document count and integrity

### 5.3 File Uploads Restore (RTO < 24 hours)

1. Sync from S3: `aws s3 sync s3://mfm-apd-backups/uploads/ /app/uploads --delete`
2. Verify file count and checksums
3. Restart application to refresh static file cache

### 5.4 Full System Restore (RTO < 8 hours)

**Scenario**: Complete infrastructure loss

1. **Infrastructure**: Deploy from Render blueprint / IaC
2. **MongoDB**: Restore from Atlas backup (Procedure 5.1)
3. **Redis**: Fresh instance (auto-rebuilds cache)
4. **Application**: Deploy from GitHub via Render
5. **File Uploads**: Sync from S3 (Procedure 5.3)
6. **Verification**: Full smoke test suite

---

## 6. Testing Schedule

| Test Type | Frequency | Scope | Owner |
|-----------|-----------|-------|-------|
| Automated Backup Verification | Daily | Atlas backup status, export completion | DevOps |
| Point-in-Time Recovery Drill | Monthly | Restore to staging cluster | DevOps |
| Full DR Drill | Quarterly | Complete restore to isolated environment | Team Lead |
| File Upload Integrity | Monthly | Checksum verification | DevOps |
| Backup Restore Test | Quarterly | Full DR procedure walkthrough | Team Lead |
| Secret Rotation | Quarterly | All secrets rotated | Security |

---

## 7. Monitoring & Alerting

### 7.1 Backup Health Alerts
- **Atlas Backup Failure**: Immediate PagerDuty/Slack alert
- **Export Job Failure**: Email + Slack within 15 minutes
- **S3 Sync Failure**: Email + Slack within 15 minutes
- **Disk Space > 80%**: Warning at 70%, Critical at 85%

### 7.2 Key Metrics Dashboard
- Backup success rate (target: 99.9%)
- RPO compliance (actual vs target)
- RTO drill results (actual vs target)
- Storage cost trends

---

## 8. Security Considerations

- **Encryption at Rest**: AES-256 (Atlas default, S3 default)
- **Encryption in Transit**: TLS 1.2+ (all connections)
- **Access Control**: IAM roles with least privilege
- **Audit Logging**: All backup/restore operations logged
- **Key Management**: AWS KMS / Atlas Encryption Keys (customer-managed option)

---

## 9. Contact Information

| Role | Name | Contact | Escalation |
|------|------|---------|------------|
| Primary DBA | [Name] | [Phone/Email] | Level 1 |
| DevOps Lead | [Name] | [Phone/Email] | Level 2 |
| Security Officer | [Name] | [Phone/Email] | Level 3 |
| Executive Sponsor | [Name] | [Phone/Email] | Level 4 |

---

## 10. Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-08-19 | System | Initial version |

---

*This document should be reviewed quarterly and updated after any infrastructure changes or DR drills.*