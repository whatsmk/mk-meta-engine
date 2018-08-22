import React from 'react'
import { AppLoader, getApps } from 'mk-app-loader'
import componentFactory from './componentFactory'
import omit from 'omit.js'
import config from './config'
import utils from 'mk-utils'

function parseMetaProps(meta, props, data) {
    const ret = {}

    Object.keys(meta).forEach(key => {
        let v = meta[key],
            t = typeof v

        if (v instanceof Array) {
            ret[key] = []

            var i, c;

            for (i = 0; c = v[i++];) {
            //v.forEach(c => {
                if (c instanceof Array) {
                    ret[key] = v
                }
                else {
                    let mc = metaToComponent(c, props, data)
                    if (mc instanceof Array)
                        ret[key] = ret[key].concat(mc)
                    else
                        ret[key].push(mc)
                }
            }
        }
        else if (t == 'object') {
            if (v && v._notParse) {
                ret[key] = v
            }
            else {
                ret[key] = metaToComponent(v, props, data)
            }
        }
        /*else if (t == 'function') {
            ret[key] = v()
        }*/
        else {
            ret[key] = v
        }
    })

    return ret
}

const toFunction = utils._.memoize((v) => {
    return new Function(v)
})

function metaToComponent(meta, props, data) {
    if (!meta)
        return meta

    const metaType = typeof meta

    if (metaType == 'object' && meta['$$typeof']) {
        return meta
    }
    else if (metaType == 'object' && meta['_isAMomentObject']) {
        return meta
    }
    else if (metaType == 'object' && meta instanceof Date) {
        return meta
    }
    else if (metaType == 'object' && meta instanceof Promise) {
        return meta
    }
    else if (metaType == 'object') {
        if (meta.component) {
            if (typeof meta.component == 'function') {
                meta.component = meta.component()
            }
            if (meta._visible === false)
                return null

            if (typeof meta._visible === 'function' && meta._visible() === false)
                return null

            //for in data.list
            if (meta['_power'] && /for[ ]+in/.test(meta._power)) {
                var p = meta._power
                    .replace(/for[ ]+in/, '')
                    .replace(' ', '')

                if (p.indexOf('_rowIndex') != -1)
                    p = p.replace('_rowIndex', meta.path.split(',').length > 1 ? meta.path.split(',')[1].replace(' ', '') : 0)

                let items = props.gf(p)

                if (!items || items.size == 0) return
                items = items.toJS()
                return items.map((o, index) => {
                    let childMeta = props.gm(meta.path + ',' + index, undefined, data)
                    delete childMeta._power
                    return metaToComponent(childMeta, props, data)
                })
            }

            //({rowIndex})=>rowIndex
            if (meta._power && meta._power.indexOf('=>') != -1) {
                return (...args) => {
                    var varsString = (toFunction('return ' + meta['_power']))()(...args)
                    var childMeta = props.gm(meta.path + ',' + varsString, undefined, data)
                    childMeta._power = undefined
                    return metaToComponent(childMeta, props, data)
                    //return co ? React.cloneElement(co, { path: meta.path + ',' + varsString }) : co
                }
            }

            const componentName = meta.component,
                component = componentFactory.getComponent(props.appName, componentName)

            /*
            var allProps = {
                key: meta.path,
                ...props,
                ...parseMetaProps(meta, props, data),
            }*/

            var allProps = parseMetaProps(meta, props, data)
            if (!allProps.key) {
                allProps.key = meta.path
            }



            /*
             var metaProps = parseMetaProps(meta, props, data)

            var metaPropsKeys = Object.keys(metaProps)
            for (var i = 0; i < metaPropsKeys.length; i++) {
                allProps[metaPropsKeys[i]] = metaProps[metaPropsKeys[i]]
            }*/

            delete allProps.component
            delete allProps.name

            //使用omit性能较低
            //allProps = omit(allProps, ['clearAppState', 'component', 'name', 'getDirectFuns', 'initView', 'payload'])

            if (componentName == 'AppLoader') {

                var propKeys = Object.keys(props),
                    i, key

                for (i = 0; key = propKeys[i++];) {
                    if (allProps[key] == undefined) {
                        allProps[key] = props[key]
                    }
                }

                //删除一些组件不需要的属性
                delete allProps.clearAppState
                delete allProps.getDirectFuns
                delete allProps.initView
                delete allProps.payload
                delete allProps.componentWillMount
                delete allProps.componentDidMount
                delete allProps.shouldComponentUpdate
                delete allProps.componentWillReceiveProps
                delete allProps.componentWillUpdate
                delete allProps.componentDidCatch
                delete allProps.componentWillUnmount
                delete allProps.componentDidUpdate
                delete allProps.unmount

                if (!allProps.appName)
                    return null

                if (allProps._notRender === true && !getApps()[allProps.appName]) {
                    return null
                }
                allProps.key = allProps.appName
                allProps.name = allProps.appName
                return React.createElement(component, allProps)
            }

            /*
            delete allProps.store
            delete allProps.appName
            delete allProps.appFullName
            delete allProps.appQuery
            delete allProps.appParams
            delete allProps.storeSubscription
            */

            return React.createElement(component, allProps)
        }
        else {
            return parseMetaProps(meta, props, data)
        }
    }
    else {
        return meta
    }
}

const MonkeyKing = (props) => {
    const { path, gm, gf } = props
    const data = gf().toJS()
    return metaToComponent(gm(path, undefined, data), props, data)
}

export default MonkeyKing