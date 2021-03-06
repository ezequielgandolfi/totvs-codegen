import { Component, ViewChild, ChangeDetectorRef, AfterContentInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { RequestService } from '../../services/request.service';
import { DataService } from '../../services/data.service';
import { Table } from '../../models/table';
import { LoadingComponent } from '../../components/loading/loading.component';
import { PoComboOption, PoNotificationService, PoTableColumn, PoTableAction, PoAccordionItemComponent, PoDialogService } from '@po-ui/ng-components';
import { Application, ApplicationField, ApplicationZoom, ApplicationEnum } from '../../models/application';
import { Field } from '../../models/field';
import { AvailableField, InsertedField, IApplicationRelation } from '../../models/model';
import { FieldEditComponent } from '../field-edit/field-edit.component';
import { TypeTranslateService } from '../../services/type-translate.service';
import { ApplicationNameComponent } from '../application-name/application-name.component';
import { RelationAddComponent } from '../relation-add/relation-add.component';
import { ListSelectorComponent } from '../../components/list-selector/list-selector.component';

@Component({
  selector: 'app-application-edit',
  templateUrl: './application-edit.component.html',
  styleUrls: ['./application-edit.component.css']
})
export class ApplicationEditComponent implements AfterContentInit {

  //#region referencias
  @ViewChild(LoadingComponent, {static:true}) loadingComponent: LoadingComponent;
  @ViewChild('fieldEditComponent', {static:false}) fieldEditComponent: FieldEditComponent;
  @ViewChild('applicationNameComponent', {static:false}) applicationNameComponent: ApplicationNameComponent;
  @ViewChild('relationAddComponent', {static:false}) relationAddComponent: RelationAddComponent;
  @ViewChild('listSelectorComponent', {static:false}) listSelectorComponent: ListSelectorComponent;
  @ViewChild('accordionComponent', {static:false}) accordionComponent: PoAccordionItemComponent;
  @ViewChild('accordionProperties', {static:false}) accordionProperties: PoAccordionItemComponent;
  //#endregion

  //#region inicializacao
  constructor(
    private requestService: RequestService,
    private dataService: DataService,
    private typeTranslateService: TypeTranslateService,
    private notificationService: PoNotificationService,
    private dialogService: PoDialogService,
    private changeDetectorRef: ChangeDetectorRef,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) { }

  ngAfterContentInit() {
    this.init();
  }
  //#endregion

  //#region definicoes de tela
  pageTitle;
  availableFieldsActions: PoTableAction[] = [
    { label: 'Adicionar', action: this.onAddFieldClick.bind(this) }
  ];
  availableFieldsColumns: PoTableColumn[] = [
    { property: 'name', label: 'Campo', width: '100%' }
  ];
  applicationFieldsActions: PoTableAction[] = [
    { label: 'Remover', type: 'danger', action: (item) => { this.onRemoveFieldClick(item) } }
  ];
  applicationFieldsColumns: PoTableColumn[] = [
    { property: 'field', label: 'Campo', width: '30%', type: 'link', action: (cell,item) => { this.onEditFieldClick(item) } },
    { property: 'name', label: 'Propriedade', width: '30%' },
    { property: 'description', label: 'Descrição', width: '40%' }
  ];
  relationsActions: PoTableAction[] = [
    { label: 'Remover', type: 'danger', action: (item) => { this.onRemoveRelationClick(item) } }
  ];
  relationsColumns: PoTableColumn[] = [
    { property: 'type', label: 'Tipo', width: '4em', type: 'label', labels: 
      [
        { value: 'enum', label: 'E', tooltip: 'Enumerador', color: 'color-01' },
        { value: 'zoom', label: 'Z', tooltip: 'Zoom', color: 'color-05' },
      ] 
    },
    { property: 'name', label: 'Nome', type: 'link', action: (cell,item) => { this.onEditRelationClick(item) } }
  ];
  //#endregion

  //#region propriedades
  tableOptions: PoComboOption[] = [];
  selectedTable: Table;
  tableFields: AvailableField[] = [];
  availableFields: AvailableField[] = [];
  insertedFields: InsertedField[] = [];
  relations: IApplicationRelation[] = [];

  application: Application;
  editMode: 'add' | 'edit';
  //#endregion

  //#region eventos de tela
  onTableChange() {
    if (this.editMode == 'add')
      this.application.description = this.dataService.tables.find(item => item.name == this.application.table)?.description;
    this.loadTable();
  }

  onChangeComponent() {
    let validName = this.typeTranslateService.validateComponentName(this.application.component);
    if (validName != this.application.component) {
      this.application.component = validName;
      this.notificationService.warning('Nome do componente foi ajustado automaticamente');
    }
  }

  onCancelClick() {
    this.router.navigate(['']);
  }

  onSaveClick() {
    if (!this.application.name) {
      this.applicationNameComponent.query(this.application.table).then(value => {
        if (value) {
          let app = Object.assign({},this.application);
          app.name = value;
          this.requestService.createApplication(app).then(() => {
            this.application = app;
            this.dataService.applications.push(this.application);
            this.notificationService.success(`Aplicação ${this.application.name} criada com sucesso!`);
            window.localStorage.setItem('codegen-team', this.application.team);
            this.router.navigate(['']);
          })
        }
      });
    }
    else {
      this.requestService.updateApplication(this.application).then(() => {
        let app = this.dataService.applications.find(item => item.name == this.application.name);
        Object.assign(app, this.application);
        this.notificationService.success(`Aplicação ${this.application.name} alterada com sucesso!`);
        window.localStorage.setItem('codegen-team', this.application.team);
        this.router.navigate(['']);
      });
    }
  }

  onAddRelationClick() {
    return this.relationAddComponent.add().then(value => {
      if (value instanceof ApplicationEnum) {
        if (!this.application.enums)
          this.application.enums = [];
        this.application.enums.push(value);
        this.refreshEnumZoomList();
      }
      else if (value instanceof ApplicationZoom) {
        if (!this.application.zooms)
          this.application.zooms = [];
        this.application.zooms.push(value);
        this.refreshEnumZoomList();
      }
      return value;
    });
  }

  onEditRelationClick(relation:IApplicationRelation) {
    return this.relationAddComponent.edit(relation.data).then(value => {
      // renomeia campos que usam esse relacionamento para o novo nome
      if (value instanceof ApplicationEnum)
        this.application.fields.filter(item => item.enumComponent == relation.name).forEach(item => item.enumComponent = value.component);
      else if (value instanceof ApplicationZoom)
        this.application.fields.filter(item => item.zoomComponent == relation.name).forEach(item => item.zoomComponent = value.application);
      //
      Object.assign(relation.data, value);
      if (value instanceof ApplicationEnum)
        relation.name = value.component;
      else if (value instanceof ApplicationZoom)
        relation.name = value.application;
      this.refreshEnumZoomList();
      return value;
    });
  }

  onRemoveRelationClick(relation:IApplicationRelation) {
    if (relation.type == 'enum') {
      // remove relacionamento dos campos que utilizam
      this.application.fields?.filter(item => item.enumComponent == relation.name).forEach(item => item.enumComponent = null);
      //
      let index = this.application.enums.findIndex(item => item.component == relation.name);
      this.application.enums.splice(index, 1);
    }
    else if (relation.type == 'zoom') {
      // remove relacionamento dos campos que utilizam
      this.application.fields?.filter(item => item.zoomComponent == relation.name).forEach(item => item.zoomComponent = null);
      //
      let index = this.application.zooms.findIndex(item => item.application == relation.name);
      this.application.zooms.splice(index, 1);
    }
    this.refreshEnumZoomList();
  }
  //#endregion

  //#region eventos internos
  onAddFieldClick(field:AvailableField) {
    let tableField = this.selectedTable.fields.find(item => item.name == field.name);
    let result = new ApplicationField();
    result.field = field.name;
    result.ablType = tableField.type;
    result.description = tableField.description;
    result.isMandatory = !!tableField.mandatory;
    result.inputFormat = tableField.format;
    this.setFieldDefaults(result);

    let relations = [...(this.application.enums || []),...(this.application.zooms || [])];

    let _edit = (f,r) => {
      this.fieldEditComponent.edit(f, r).then(value => {
        if (value) {
          if (!this.application.fields)
            this.application.fields = [];
          this.application.fields.push(value);
          this.resetFieldsSequence();
          this.refreshAvailableFields();
          this.refreshAppFieldList();
        }
      });
    }

    // verifica se possui uma aplicacao que sirva como zoom para o campo
    this.loadingComponent.show('Verificando campo...');
    this.requestService.searchRelation(field.name)
      .then(value => {
        this.loadingComponent.hide();
        if (value.length > 0) {
          let _relation = this.application.zooms?.find(item => value.find(a => a.name == item.application));
          if (_relation) {
            result.zoomComponent = _relation.application;
            _edit(result, relations);
          }
          else {
            this.dialogService.confirm({
              title: 'Relacionamento',
              message: 'Encontrado uma aplicação relacionada a este campo. Deseja incluir um Zoom para esta aplicação?',
              confirm: () => {
                if (value.length == 1) {
                  let _zoom = new ApplicationZoom();
                  _zoom.application = value[0].name;
                  this.relationAddComponent.edit(_zoom).then((z:ApplicationZoom) => {
                    if (z) {
                      if (!this.application.zooms)
                        this.application.zooms = [];
                      this.application.zooms.push(z);
                      this.refreshEnumZoomList();
                      result.zoomComponent = z.application;
                      relations.push(z);
                      _edit(result, relations);
                    }
                  });
                }
                else {
                  this.listSelectorComponent.select(value, 'name').then(selected => {
                    if (selected) {
                      let _zoom = new ApplicationZoom();
                      _zoom.application = selected.name;
                      this.relationAddComponent.edit(_zoom).then((z:ApplicationZoom) => {
                        if (z) {
                          if (!this.application.zooms)
                            this.application.zooms = [];
                          this.application.zooms.push(z);
                          this.refreshEnumZoomList();
                          result.zoomComponent = z.application;
                          relations.push(z);
                          _edit(result, relations);
                        }
                      });
                    }
                  });
                }
              },
              cancel: () => { _edit(result, relations) }
            })
          }
        }
        else {
          _edit(result, relations);
        }
      })
      .catch(() => this.loadingComponent.hide());
  }

  onEditFieldClick(field:InsertedField) {
    let appField = this.application.fields.find(item => item.field == field.field);
    let relations = [...(this.application.enums || []),...(this.application.zooms || [])];

    this.fieldEditComponent.edit(appField, relations)
      .then(value => {
        if (value) {
          Object.assign(appField,value);
          this.refreshAppFieldList();
        }
      });
  }

  onRemoveFieldClick(field:InsertedField) {
    let index = this.application.fields.findIndex(item => item.field == field.field);
    this.application.fields.splice(index, 1);
    this.resetFieldsSequence();
    this.refreshAvailableFields();
    this.refreshAppFieldList();
  }
  //#endregion

  //#region metodos internos
  private init() {
    this.initTables().then(() => {
      if (this.activatedRoute.snapshot.paramMap.has('name')) {
        let appName = this.activatedRoute.snapshot.paramMap.get('name');
        this.pageTitle = `Alterar aplicação - ${appName}`;
        this.editMode = 'edit';
        let app = this.dataService.applications.find(item => item.name == appName);
        this.initModel(app);
        this.onTableChange();
        this.changeDetectorRef.detectChanges();
        this.accordionProperties.expand();
      }
      else {
        this.pageTitle = 'Nova aplicação';
        this.editMode = 'add';
        this.initModel();
        this.changeDetectorRef.detectChanges();
        this.accordionComponent.expand();
      }
    });
  }

  private initModel(application?:Application) {
    this.application = new Application();
    if (application)
      this.application.parseJsonToObject(application);
    else {
      this.application.module = 'hxx';
      this.application.version = 'v1';
      this.application.team = window.localStorage.getItem('codegen-team');
    }
    this.refreshAppFieldList();
    this.refreshEnumZoomList();
  }

  private initTables(): Promise<any> {
    if (!this.dataService.tables) {
      this.loadingComponent.show('Carregando tabelas...');
      return this.requestService.getTables()
        .then(value => {
          this.dataService.tables = value.tables;
          this.refreshTables();
        })
        .finally(() => this.loadingComponent.hide());
    }
    else {
      this.refreshTables();
      return Promise.resolve();
    }
  }
  
  private refreshTables() {
    this.tableOptions = this.dataService.tables.map(item => <PoComboOption>{ value: item.name, label: item.name }).sort((a,b) => {return a.label.localeCompare(b.label)})
  }

  private loadTable() {
    if (this.application.table) {
      this.loadingComponent.show('Carregando tabela...');
      this.requestService.getTable(this.application.table)
        .then(value => { this.setTable(value) })
        .finally(() => { this.loadingComponent.hide() });
    }
    else {
      this.setTable()
    }
  }

  private setTable(value?:Table) {
    this.selectedTable = value;
    if (value) 
      this.tableFields = [...value.fields.sort((a,b) => { return a.name.localeCompare(b.name) }).map(item => this.mapAvailableField(item))];
    else
      this.tableFields = [];
    this.refreshAvailableFields();
  }

  private refreshAvailableFields() {
    this.availableFields = this.tableFields.filter(field => !this.application.fields?.find(item => item.field == field.name));
  }

  private refreshAppFieldList() {
    this.insertedFields = this.application.fields?.map(item => this.mapInsertedField(item)) || [];
  }

  private mapAvailableField(value:Field): AvailableField {
    let result = new AvailableField();
    result.name = value.name;
    return result;
  }

  private mapInsertedField(value:ApplicationField): InsertedField {
    let result = new InsertedField();
    result.field = value.field;
    result.name = value.name;
    result.description = value.description;
    result.$field = value;
    return result;
  }

  private setFieldDefaults(field:ApplicationField) {
    // PK
    if (this.selectedTable.indexes?.find(item => item.primary && item.fields.includes(field.field)))
      field.isPrimary = true;
    field.isMandatory = field.isPrimary;
    field.isEditable = !field.isPrimary;
    field.isVisible = true;
    field.isListed = true;
    field.isFilter = field.isPrimary;
    field.jsType = this.typeTranslateService.abl2js(field.ablType);
    field.isRangeFilter = (field.isFilter && field.jsType == 'number');

    if (field.inputFormat) {
      if (field.inputFormat.toLowerCase().startsWith('x('))
        field.maxSize = Number.parseInt(field.inputFormat.substring(2, field.inputFormat.length-1));
      else
        field.maxSize = field.inputFormat.length;

      if ((field.ablType.match('char'))||(field.inputFormat.toLowerCase().startsWith('x(')))
        field.inputFormat = '';
    }

    let defaults = this.typeTranslateService.fieldDefaults(field.field);
    Object.keys(defaults).forEach(k => field[k] = defaults[k]);
  }

  private resetFieldsSequence() {
    this.application.fields.forEach((item,index) => item.sequence = index + 1);
  }

  private refreshEnumZoomList() {
    let result:IApplicationRelation[] = [];
    this.application.enums?.forEach(item => { result.push(<IApplicationRelation>{ type: 'enum', name: item.component, data: item }) });
    this.application.zooms?.forEach(item => { result.push(<IApplicationRelation>{ type: 'zoom', name: item.application, data: item }) });
    this.relations = result.sort((v1,v2) => v1.name.localeCompare(v2.name));
  }
  //#endregion

}