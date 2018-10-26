import { Component, Input, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { I18NService, Utils } from 'app/shared/api';
import { MigrationService } from '../migration.service';

@Component({
  selector: 'migration-detail',
  templateUrl: './migration-detail.component.html',
  styleUrls: [

  ]
})
export class MigrationDetailComponent implements OnInit {
  @Input() job;

  migrationInstance = {
    "name": "--",
    "srcBucket": "--",
    "destBucket": "--",
    "rule": "--",
    "excutingTime":'--',
    "analysisCluster": "--",
    "deleteSrcObject": true,
    "id": "--",
    "status": "--",
    "endTime": "--",
    "srcBackend": "",
    "destBackend": "",
    "objectnum":0,
    "totalsize":"0 MB"
  }

  constructor(
    private ActivatedRoute: ActivatedRoute,
    public I18N: I18NService,
    private MigrationService: MigrationService,
  ) { }

  ngOnInit() {
    if(this.job){
      // tag add content
    }
  }
}
