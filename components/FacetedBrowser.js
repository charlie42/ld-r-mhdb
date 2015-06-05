import React from 'react';
import Facet from './Facet';
import {propertiesConfig, facetsConfig} from '../configs/reactor';
import FacetedBrowserStore from '../stores/FacetedBrowserStore';
import {connectToStores} from 'fluxible/addons';
import loadFacets from '../actions/loadFacets';
import ResourceList from './ResourceList';
import ResourceListPager from './ResourceListPager';

class FacetedBrowser extends React.Component {
    constructor(props) {
        super(props);
        this.state = {selection: {}};
    }
    componentDidMount() {

    }
    gotoPage(page) {
        this.context.executeAction(loadFacets, {mode: 'second', id: this.props.FacetedBrowserStore.graphName, page: page, selection: { prevSelection: this.state.selection}});
    }
    addCommas(n){
        let rx = /(\d+)(\d{3})/;
        return String(n).replace(/^\d+/, function(w){
            while(rx.test(w)){
                w = w.replace(rx, '$1,$2');
            }
            return w;
        });
    }
    getPropertyConfig(graphName, propertyURI){
        let selectedConfig;
        let g = graphName;
        if(!g){
            g = 'generic';
        }
        let hasFacetConfig = facetsConfig[g].config ? (facetsConfig[g].config[propertyURI] ? 1 : 0) : 0;
        if(hasFacetConfig){
            //first check the custom facets config
            selectedConfig = facetsConfig[g].config[propertyURI];
        }else{
            //second: check the generic facet config
            let hasGenericFacetConfig = facetsConfig.generic.config ? (facetsConfig.generic.config[propertyURI] ? 1 : 0) : 0;
            if(hasGenericFacetConfig){
                selectedConfig = facetsConfig.generic.config[propertyURI];
            }else{
                let hasPropConfig = propertiesConfig ? (propertiesConfig[g] ? (propertiesConfig[g].config ? 1 : 0) : 0) : 0;
                if(hasPropConfig && propertiesConfig[g].config[propertyURI]){
                    selectedConfig = propertiesConfig[g].config[propertyURI];
                }else{
                    if(propertiesConfig.generic.config[propertyURI]){
                        selectedConfig = propertiesConfig.generic.config[propertyURI];
                    }else{
                        selectedConfig = {};
                    }
                }
            }
        }
        return selectedConfig;
    }
    buildMasterFacet(graphName) {
        let self = this;
        let properties = [];
        let selectedFacetConfig;
        let g = graphName;
        if(!g){
            g = 'generic';
        }
        if(!facetsConfig[g]){
            selectedFacetConfig = facetsConfig.generic;
        }else{
            selectedFacetConfig = facetsConfig[g];
        }
        //action only if there is a config
        let propConfig;
        if(selectedFacetConfig.list){
            selectedFacetConfig.list.forEach(function(el) {
                propConfig = self.getPropertyConfig(graphName, el);
                properties.push({label: (propConfig ? (propConfig.label ? propConfig.label : 0) : 0), value: el, valueType: 'uri'});
            });
        }
        return properties;
    }
    handleOnCheck(level, status, value, propertyURI) {
        let self = this;
        let hadAnySelected = 0;
        //handling cascading facet update
        let sideEffectsArr = [];
        let atLeastOne = 0;
        if(level === 2){
            //keep history of selection up to date
            if(status){
                if(!this.state.selection[propertyURI]){
                    this.state.selection[propertyURI] = [];
                }
                this.state.selection[propertyURI].push(value);
            }else{
                this.state.selection[propertyURI].splice(this.state.selection[propertyURI].indexOf(value), 1);
            }
            //check if there are active facets to be updated as side effect
            sideEffectsArr = [];
            atLeastOne = 0;
            for (let key in this.state.selection) {
                //apply on active but non-selected
                if(key !== propertyURI && !this.state.selection[key].length){
                    sideEffectsArr.push(key);
                }else{
                    atLeastOne = 1;
                }
            }
            this.context.executeAction(loadFacets, {mode: 'second', id: this.props.FacetedBrowserStore.graphName, page: this.props.FacetedBrowserStore.page, selection: {propertyURI: propertyURI, value: value, status: status, prevSelection: this.state.selection}});
        }else{
            //for master level
            if(this.state.selection[value] && this.state.selection[value].length){
                hadAnySelected = 1;
            }else{
                hadAnySelected = 0;
            }
            if(!status){
                //empty the selection
                delete this.state.selection[value];
            }else{
                //initiate facet
                this.state.selection[value] = [];
            }
            sideEffectsArr = [];
            atLeastOne = 0;
            for (let key in this.state.selection) {
                //apply on active but non-selected
                if(!this.state.selection[key].length){
                    sideEffectsArr.push(key);
                }else{
                    atLeastOne = 1;
                }
            }
            // there should be at least one second level facet selected for cascading effect
            if(!atLeastOne){
                sideEffectsArr = [];
            }
            //should not run if there is a side effect -> prevents duplicate runs
            if(sideEffectsArr.indexOf(value) === -1){
                this.context.executeAction(loadFacets, {mode: 'master', id: this.props.FacetedBrowserStore.graphName, page: this.props.FacetedBrowserStore.page, selection: {propertyURI: propertyURI, value: value, status: status, prevSelection: this.state.selection}});
            }
            //on uncheck update list of resources
            if(!status && hadAnySelected){
                this.context.executeAction(loadFacets, {mode: 'second', id: this.props.FacetedBrowserStore.graphName, page: this.props.FacetedBrowserStore.page, selection: {propertyURI: value, value: value, status: status, prevSelection: this.state.selection}});
                //add new type of side effect on uncheck
                for (let key in this.state.selection) {
                    sideEffectsArr.push(key);
                }
            }
        }
        // console.log(sideEffectsArr);
        //apply side effects
        sideEffectsArr.forEach(function(el){
            self.context.executeAction(loadFacets, {mode: 'sideEffect', id: self.props.FacetedBrowserStore.graphName, page: self.props.FacetedBrowserStore.page, selection: {status: status, propertyURI: el, prevSelection: self.state.selection}});
        });
    }
    //used to fix the key of component in dynamic cases
    findIndexInProperties(properties, value) {
        let i = 0;
        properties.forEach(function(el, index){
            if(el.value === value){
                i = index;
            }
        });
        return i;
    }
    getPropertyLabel(uri) {
        let property = '';
        let tmp = uri;
        let tmp2 = tmp.split('#');
        if(tmp2.length > 1){
            property = tmp2[1];
        }else{
            tmp2 = tmp.split('/');
            property = tmp2[tmp2.length - 1];
        }
        return property;
    }
    render() {
        let self = this;
        let showFactes = 0;
        let properties = this. buildMasterFacet(this.props.FacetedBrowserStore.graphName);
        //console.log(self.props.FacetedBrowserStore.facets);
        let list = properties.map(function(node, index) {
            //console.log(self.props.FacetedBrowserStore.facets);
            if(self.props.FacetedBrowserStore.facets[node.value]){
                showFactes = 1;
                //console.log(self.findIndexInProperties(properties, node.value));
                return (
                    <Facet onCheck={self.handleOnCheck.bind(self, 2)} key={self.findIndexInProperties(properties, node.value)} spec={{propertyURI: node.value, property: self.getPropertyLabel(node.value), instances: self.props.FacetedBrowserStore.facets[node.value]}} config={self.getPropertyConfig(self.props.FacetedBrowserStore.graphName, node.value)} graphName={self.props.FacetedBrowserStore.graphName}/>
                );
            }else{
                return undefined;
            }
        });
        let pagerSize = showFactes ? 5 : 10;
        let resSize = showFactes ? 'seven' : 'eleven';
        let facetsDIV = showFactes ? <div className="ui stackable five wide column">{list}</div> : '';
        let resourceDIV;
        if(this.props.FacetedBrowserStore.total){
            resourceDIV = <div className="ui segment">
                            <h3 className="ui dividing header">
                                Resources <span className="ui blue circular label">{this.addCommas(this.props.FacetedBrowserStore.total)}</span>
                            {this.props.FacetedBrowserStore.isComplete ? '' : <img src="/assets/img/loader.gif" alt="loading..."/>}
                             </h3>
                            <ResourceList resources={this.props.FacetedBrowserStore.resources} graphName={this.props.FacetedBrowserStore.graphName} OpenInNewTab={true} isBig={!showFactes}/>
                            <ResourceListPager handleClick={this.gotoPage.bind(this)} graphName={this.props.FacetedBrowserStore.graphName} total={this.props.FacetedBrowserStore.total} threshold={pagerSize} currentPage={this.props.FacetedBrowserStore.page}/>
                          </div>;
        }
        return (
            <div className="ui page grid" ref="facetedBrowser">
                    <div className="ui stackable four wide column">
                        <Facet color="green" onCheck={this.handleOnCheck.bind(this, 1)} key="master" maxHeight={500} minHeight={300} spec={{property: '', propertyURI: '', instances: properties}} config={{label: 'Properties'}} graphName={this.props.FacetedBrowserStore.graphName}/>
                    </div>
                    {facetsDIV}
                    <div className={'ui stackable ' + resSize + ' wide column'}>
                        {resourceDIV}
                    </div>
            </div>
        );
    }
}
FacetedBrowser.contextTypes = {
    executeAction: React.PropTypes.func.isRequired,
    getUser: React.PropTypes.func
};
FacetedBrowser = connectToStores(FacetedBrowser, [FacetedBrowserStore], function (stores, props) {
    return {
        FacetedBrowserStore: stores.FacetedBrowserStore.getState()
    };
});
export default FacetedBrowser;