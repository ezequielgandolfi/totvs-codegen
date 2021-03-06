import { Injectable } from '@angular/core';
import { ZikiHttpServices } from 'ziki-http-services';
import { TableIndex, Table } from '../models/table';
import { TemplateIndex } from '../models/template';
import { Application, ApplicationIndex } from '../models/application';
import { GenerateResult, Generate } from '../models/generate';

@Injectable()
export class RequestService {

  private get LOCATION() { return '' /*window.location.origin*/ }
  private readonly URL = `${this.LOCATION}/api`;
  private readonly URL_TABLES = `${this.URL}/table`;
  private readonly URL_TABLE_DATA = `${this.URL_TABLES}/{{name}}`;
  private readonly URL_TEMPLATES = `${this.URL}/template`;
  private readonly URL_APPLICATION = `${this.URL}/application`;
  private readonly URL_APPLICATION_KEY = `${this.URL_APPLICATION}/{{name}}`;
  private readonly URL_GENERATE = `${this.URL}/generate`;
  private readonly URL_RELATION = `${this.URL}/relation`;

  getTables(): Promise<TableIndex> {
    return ZikiHttpServices
      .getInstance<TableIndex>(TableIndex, this.URL_TABLES)
      .get();
  }

  getTable(table:string): Promise<Table> {
    return ZikiHttpServices
      .getInstance<Table>(Table, this.URL_TABLE_DATA)
      .setPathParams({name: table})
      .get();
  }

  getTemplates(): Promise<TemplateIndex> {
    return ZikiHttpServices
      .getInstance<TemplateIndex>(TemplateIndex, this.URL_TEMPLATES)
      .get();
  }

  getApplication(name): Promise<Application> {
    return ZikiHttpServices
      .getInstance<Application>(Application, this.URL_APPLICATION_KEY)
      .setPathParams({name:name})
      .get()
  }

  searchApplication(filter): Promise<Application[]> {
    return ZikiHttpServices
      .getInstance<Application[]>(Application, this.URL_APPLICATION)
      .setQueryParams(filter)
      .get()
  }

  createApplication(application:Application): Promise<Application> {
    return ZikiHttpServices
      .getInstance<Application>(Application, this.URL_APPLICATION)
      .post(application);
  }

  updateApplication(application:Application) {
    return ZikiHttpServices
      .getInstance<any>(Object, this.URL_APPLICATION_KEY)
      .setPathParams({name:application.name})
      .put(application);
  }

  deleteApplication(application:ApplicationIndex) {
    return ZikiHttpServices
      .getInstance<any>(Object, this.URL_APPLICATION_KEY)
      .setPathParams({name:application.name})
      .delete();
  }

  generate(application:Application,templates:string[],session?:string): Promise<GenerateResult> {
    let _model: Generate = { application: application.name, session: session, templates: templates };
    return ZikiHttpServices
      .getInstance<GenerateResult>(GenerateResult, this.URL_GENERATE)
      .post(_model);
  }

  searchRelation(fieldName:string): Promise<Application[]> {
    let _model = { field: fieldName };
    return ZikiHttpServices
      .getInstance<Application[]>(Application, this.URL_RELATION)
      .setQueryParams(_model)
      .get();
  }
}
