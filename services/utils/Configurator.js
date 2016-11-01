'use strict';
import {config} from '../../configs/reactor';
import DynamicConfigurator from '../../plugins/dynamicConfiguration/DynamicConfigurator';
let dynamicConfigurator = new DynamicConfigurator();

class Configurator{
    constructor() {
        this.config = config;
    }
    cloneConfig(a) {
        return JSON.parse(JSON.stringify(a));
    }
    //collects the generic config based on the depth provided
    prepareGenericConfig(depth) {
        let config = this.cloneConfig(this.config);
        let output = {};
        if(depth < 1 || depth > 4){
            return output;
        }
        output = config.dataset.generic;
        if(depth > 1){
            for(let prop in config.resource.generic) {
                output[prop] = config.resource.generic[prop];
            }
        }
        if(depth > 2){
            for(let prop in config.property.generic) {
                output[prop] = config.property.generic[prop];
            }
        }
        if(depth > 3){
            for(let prop in config.object.generic) {
                output[prop] = config.object.generic[prop];
            }
        }
        return output;
    }
    prepareDatasetConfig(useGeneric, graphName, callback) {
        let config = this.cloneConfig(this.config);
        //default config comes from generic dataset
        let output = {};
        if(useGeneric){
            output = this.prepareGenericConfig(1);
        }

        //retrieve all dynamic resource configs stored in the triple store
        dynamicConfigurator.prepareDynamicDatasetConfig(graphName, (dynamicConfig)=> {
            //console.log(dynamicConfig.dataset);
            if(config.dataset[graphName]){
                //there is a user-defined config, overwrite default config then
                for(let prop in config.dataset[graphName]) {
                    output[prop] = config.dataset[graphName][prop];
                }
            }
            //design decision: dynamic configs can overwrite existing local configs
            if(dynamicConfig.dataset[graphName]) {
                for(let prop in dynamicConfig.dataset[graphName]) {
                    output[prop] = dynamicConfig.dataset[graphName][prop];
                }
            }
            callback (output);
        })

    }
    prepareResourceConfig(useGeneric, graphName, resourceURI, resourceType, callback) {
        //resource type can be a set of values
        if(!Array.isArray(resourceType)){
            resourceType=[resourceType];
        }
        let config = this.cloneConfig(this.config);
        let output = {};
        //get the generic resource config
        if(useGeneric){
            output = this.prepareGenericConfig(2);
        }
        //get the dataset config
        this.prepareDatasetConfig(0, graphName, (tmp)=> {
            for(let prop in tmp) {
                output[prop] = tmp[prop];
            }
            //retrieve all dynamic resource configs stored in the triple store
            dynamicConfigurator.prepareDynamicResourceConfig(graphName, resourceURI, resourceType, (dynamicConfig)=> {
                //console.log(dynamicConfig);
                //go to user-defined scopes
                //it goes from less-specific to most-specific config
                //check resource Type scope as well
                for(let res in config.resource) {
                    if(config.resource[res].treatAsResourceType){
                        if(resourceType.indexOf(res) !== -1){
                            for(let prop in config.resource[res]) {
                                output[prop] = config.resource[res][prop];
                            }
                        }
                    }
                }
                if(config.resource[resourceURI]){
                    for(let prop in config.resource[resourceURI]) {
                        output[prop] = config.resource[resourceURI][prop];
                    }
                }
                //design decision: dynamic configs can overwrite existing local configs
                if(dynamicConfig.resource[resourceURI]) {
                    for(let prop in dynamicConfig.resource[resourceURI]) {
                        output[prop] = dynamicConfig.resource[resourceURI][prop];
                    }
                }
                if(config.dataset_resource[graphName]){
                    if(config.dataset_resource[graphName][resourceURI]){
                        //apply config on resource URI
                        for(let prop in config.dataset_resource[graphName][resourceURI]) {
                            output[prop] = config.dataset_resource[graphName][resourceURI][prop];
                        }
                    }else{
                        //check if there is config on resource type
                        //apply config on a specific resource type
                        for(let res in config.dataset_resource[graphName]) {
                            if(config.dataset_resource[graphName][res].treatAsResourceType){
                                if(resourceType.indexOf(res) !== -1){
                                    for(let prop in config.dataset_resource[graphName][res]) {
                                        output[prop] = config.dataset_resource[graphName][res][prop];
                                    }
                                }
                            }
                        }
                    }
                }
                //design decision: dynamic configs can overwrite existing local configs
                if(dynamicConfig.dataset_resource[graphName]) {
                    if(dynamicConfig.dataset_resource[graphName][resourceURI]){
                        //apply config on resource URI
                        for(let prop in dynamicConfig.dataset_resource[graphName][resourceURI]) {
                            output[prop] = dynamicConfig.dataset_resource[graphName][resourceURI][prop];
                        }
                    }
                }
                let finalOutput = {};
                //remove irrelevant attributes from config
                let irrels = ['resourceFocusType', 'maxNumberOfResourcesOnPage', 'datasetReactor', 'datasetLabel', 'resourceLabelProperty'];
                for(let prop in output) {
                    if(irrels.indexOf(prop) === -1) {
                        finalOutput[prop] = output[prop];
                    }
                }
                callback(finalOutput);

            })

        });

    }
    preparePropertyConfig(useGeneric, graphName, resourceURI, resourceType, propertyURI, callback) {
        if(!Array.isArray(resourceType)){
            resourceType=[resourceType];
        }
        let config = this.cloneConfig(this.config);
        let output = {};
        if(useGeneric){
            output = this.prepareGenericConfig(3);
        }
        //first we need to get upper level configs that come from resource config
        this.prepareResourceConfig(0, graphName, resourceURI, resourceType, (tmp)=> {
            //owerwrite generic ones
            for(let prop in tmp) {
                output[prop] = tmp[prop];
            }

            //retrieve all dynamic property configs stored in the triple store
            dynamicConfigurator.prepareDynamicPropertyConfig(graphName, resourceURI, resourceType, propertyURI, (dynamicConfig)=> {
                //console.log(dynamicConfig);
                if(config.property[propertyURI]){
                    for(let prop in config.property[propertyURI]) {
                        output[prop] = config.property[propertyURI][prop];
                    }
                //check the dynamic config
                }
                //design decision: dynamic configs can overwrite existing local configs
                if (dynamicConfig.property[propertyURI]) {
                    for(let prop in dynamicConfig.property[propertyURI]) {
                        output[prop] = dynamicConfig.property[propertyURI][prop];
                    }
                }
                if(config.dataset_property[graphName]){
                    if(config.dataset_property[graphName][propertyURI]){
                        for(let prop in config.dataset_property[graphName][propertyURI]) {
                            output[prop] = config.dataset_property[graphName][propertyURI][prop];
                        }
                    }
                }
                //design decision: dynamic configs can overwrite existing local configs
                if (dynamicConfig.dataset_property[graphName]){
                    if(dynamicConfig.dataset_property[graphName][propertyURI]){
                        for(let prop in dynamicConfig.dataset_property[graphName][propertyURI]) {
                            output[prop] = dynamicConfig.dataset_property[graphName][propertyURI][prop];
                        }
                    }
                }
                if(config.resource_property[resourceURI]){
                    if(config.resource_property[resourceURI][propertyURI]){
                        for(let prop in config.resource_property[resourceURI][propertyURI]) {
                            output[prop] = config.resource_property[resourceURI][propertyURI][prop];
                        }
                    }
                }
                //design decision: dynamic configs can overwrite existing local configs
                if (dynamicConfig.resource_property[resourceURI]){
                    if(dynamicConfig.resource_property[resourceURI][propertyURI]){
                        for(let prop in dynamicConfig.resource_property[resourceURI][propertyURI]) {
                            output[prop] = dynamicConfig.resource_property[resourceURI][propertyURI][prop];
                        }
                    }
                }
                if(config.dataset_resource_property[graphName]){
                    if(config.dataset_resource_property[graphName][resourceURI]){
                        if(config.dataset_resource_property[graphName][resourceURI][propertyURI]){
                            for(let prop in config.dataset_resource_property[graphName][resourceURI][propertyURI]) {
                                output[prop] = config.dataset_resource_property[graphName][resourceURI][propertyURI][prop];
                            }
                        }
                    }
                }
                //design decision: dynamic configs can overwrite existing local configs
                if (dynamicConfig.dataset_resource_property[graphName]){
                    if(dynamicConfig.dataset_resource_property[graphName][resourceURI]){
                        if(dynamicConfig.dataset_resource_property[graphName][resourceURI][propertyURI]){
                            for(let prop in dynamicConfig.dataset_resource_property[graphName][resourceURI][propertyURI]) {
                                output[prop] = dynamicConfig.dataset_resource_property[graphName][resourceURI][propertyURI][prop];
                            }
                        }
                    }
                }
                let finalOutput = {};
                //remove irrelevant attributes from config
                let irrels = ['resourceFocusType', 'maxNumberOfResourcesOnPage', 'datasetReactor', 'usePropertyCategories', 'propertyCategories', 'resourceReactor', 'treatAsResourceType', 'datasetLabel', 'resourceLabelProperty'];
                for(let prop in output) {
                    if(irrels.indexOf(prop) == -1) {
                        finalOutput[prop] = output[prop];
                    }
                }
                callback(finalOutput);

            });

        });

    }
    prepareObjectConfig(useGeneric, graphName, resourceURI, propertyURI, objectValue, callback) {
        //todo: it is not yet completely implemented because we are not sure about the possible use case
        //it has to go through 15 scopes which causes an overhead if unnecessary
        //we can easily implement this if needed in future so that users can have components in the scope of objects
        //for now, we only add one check for object data types which makes sense in some scenarios
        let config = this.cloneConfig(this.config);
        let output = {};
        //collect the generic config
        if(useGeneric){
            output = this.prepareGenericConfig(4);
        }
        this.preparePropertyConfig(0, graphName, resourceURI, resourceType, propertyURI, (tmp)=> {
            //owerwrite generic ones
            for(let prop in tmp) {
                output[prop] = tmp[prop];
            }
            //todo-----
            //traverese object configs
            //-------
            let finalOutput = {};
            //remove irrelevant attributes from config
            let irrels = ['propertyReactor', 'objectReactor', 'objectIViewer', 'objectIEditor', 'extendedOEditor', 'extendedOViewer'];
            for(let prop in output) {
                if(irrels.indexOf(prop) == -1) {
                    finalOutput[prop] = output[prop];
                }
            }
            callback(finalOutput);
        });


    }
    getResourceFocusType(cnf, graphName){
        let out = {'type':[], 'labelProperty': []};
        if(cnf && cnf.resourceFocusType){
            out['type'] = cnf.resourceFocusType;
            if(cnf.resourceLabelProperty && cnf.resourceLabelProperty.length){
                out['labelProperty'] = cnf.resourceLabelProperty;
            } else if(config.dataset[graphName] && config.dataset[graphName].resourceFocusType){
                out['type'] = config.dataset[graphName].resourceFocusType;
                if(config.dataset[graphName].resourceLabelProperty && config.dataset[graphName].resourceLabelProperty.length){
                    out['labelProperty'] = config.dataset[graphName].resourceLabelProperty;
                }
            }
        }
        return out;
    }
}
export default Configurator;
