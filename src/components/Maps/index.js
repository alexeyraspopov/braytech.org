import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import cx from 'classnames';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, ImageOverlay, Marker } from 'react-leaflet';

import manifest from '../../utils/manifest';
import maps from '../../data/lowlines/maps';

import ChecklistFactory from '../../views/Checklists/ChecklistFactory';

import * as marker from './markers';

import './styles.css';

class Maps extends React.Component {
  constructor(props) {
    super(props);

    const { t, member } = this.props;

    this.state = {
      destination: this.props.id || 'new-pacific-arcology',
      zoom: 0,
      layers: [],
      checklists: []
    };
  }

  destinations = ['edz', 'new-pacific-arcology', 'echo-mesa', 'nessus', 'mercury', 'hellas-basin', 'tangled-shore', 'dreaming-city', 'tower'];

  componentDidMount() {
    window.scrollTo(0, 0);

    this.generateMap(this.state.destination);
    this.generateChecklists();
  }

  componentDidUpdate(pP) {
    const { t, member } = this.props;

    if (pP.member.data.updated !== member.data.updated) {
      this.generateChecklists();
    }
  }

  generateChecklists = () => {
    const { t, member } = this.props;

    const factory = new ChecklistFactory(t, member.data.profile, member.characterId, false);

    const checklists = [
      {
        type: 'region-chests',
        name: t('Region Chests'),
        icon: 'destiny-region_chests',
        items: factory.regionChests({ data: true }).checklist.items.filter(i => i.destinationHash === maps[this.state.destination].destination.hash)
      },
      {
        type: 'lost-sectors',
        name: t('Lost Sectors'),
        icon: 'destiny-lost_sectors',
        items: factory.lostSectors({ data: true }).checklist.items.filter(i => i.destinationHash === maps[this.state.destination].destination.hash)
      },
      // {
      //   name: t('Adventures'),
      //   items: factory.adventures({ data: true }).checklist.items.filter(i => i.destinationHash === maps[this.state.destination].destination.hash)
      // },
      {
        type: 'ghost-scans',
        name: t('Ghost Scans'),
        icon: 'destiny-ghost',
        items: factory.ghostScans({ data: true }).checklist.items.filter(i => i.destinationHash === maps[this.state.destination].destination.hash)
      },
      {
        type: 'sleeper-nodes',
        name: t('Sleeper Nodes'),
        icon: 'destiny-sleeper_nodes',
        items: factory.sleeperNodes({ data: true }).checklist.items.filter(i => i.destinationHash === maps[this.state.destination].destination.hash)
      },
      {
        type: 'lost-memory-fragments',
        name: t('Lost Memory Fragments'),
        icon: 'destiny-lost_memory_fragments',
        items: factory.latentMemories({ data: true }).checklist.items.filter(i => i.destinationHash === maps[this.state.destination].destination.hash)
      }
    ];

    console.log(checklists);

    this.setState({
      checklists
    });
  };

  generateMap = async destination => {
    let layers = maps[destination].map.layers;

    layers = await Promise.all(
      layers.map(async layer => {
        if (layer.nodes) {
          await Promise.all(
            layer.nodes.map(async layer => {
              return await fetch(layer.image)
                .then(r => {
                  return r.blob();
                })
                .then(blob => {
                  const objectURL = URL.createObjectURL(blob);

                  layer.image = objectURL;
                  return layer;
                })
                .catch(e => {
                  console.log(e);
                });
            })
          );

          return layer;
        } else {
          return await fetch(layer.image)
            .then(r => {
              return r.blob();
            })
            .then(blob => {
              const objectURL = URL.createObjectURL(blob);

              layer.image = objectURL;
              return layer;
            })
            .catch(e => {
              console.log(e);
            });
        }
      })
    );

    // layers = flatten(layers);

    // console.log(layers);

    layers = await Promise.all(
      layers.map(async layer => {
        if (layer.color) {
          const image = document.createElement('img');
          image.src = layer.image;

          await new Promise(resolve => {
            image.onload = e => resolve();
          });

          const canvas = document.createElement('canvas');
          canvas.width = layer.width;
          canvas.height = layer.height;
          const context = canvas.getContext('2d');

          context.fillStyle = layer.color;
          context.fillRect(0, 0, layer.width, layer.height);

          context.globalCompositeOperation = 'destination-atop';
          context.drawImage(image, 0, 0, layer.width, layer.height);

          layer.image = canvas.toDataURL();

          return layer;
        } else {
          return layer;
        }
      })
    );

    console.log(layers);

    this.setState({ layers });
  };

  setZoom = viewport => {
    this.setState({ zoom: viewport.zoom });
  };

  render() {
    const destination = this.state.destination;

    const map = maps[destination].map;
    
    const viewWidth = 1920;
    const viewHeight = 1080;

    const mapXOffset = (map.width - viewWidth) / 2;
    const mapYOffset = -(map.height - viewHeight) / 2;

    const bounds = [[0, 0], [map.height, map.width]];

    const centerYOffset = -(map.center && map.center.y) || 0;
    const centerXOffset = (map.center && map.center.x) || 0;

    const center = [(map.height / 2) + centerYOffset , (map.width / 2) + centerXOffset];

    // console.log(map.width, map.height, mapXOffset, mapYOffset)

    // console.log(maps);

    return (
      <div className={cx('map-omega', `zoom-${this.state.zoom}`)}>
        <div className='leaflet-pane leaflet-background-pane'>
          {this.state.layers
            .filter(layer => layer.type === 'background')
            .map(layer => {
              return <img key={layer.id} alt={layer.id} src={layer.image} className={cx('layer-background', `layer-${layer.id}`, { 'interaction-none': true })} />;
            })}
        </div>
        <Map center={center} zoom={this.state.zoom} minZoom='-3' maxZoom='1' maxBounds={bounds} crs={L.CRS.Simple} attributionControl={false} onViewportChanged={this.setZoom} zoomControl={false}>
          {this.state.layers
            .filter(layer => layer.type !== 'background')
            .map(layer => {              
              const layerX = layer.x ? layer.x : 0;
              const layerY = layer.y ? -layer.y : 0;
              const layerWidth = layer.width * 1;
              const layerHeight = layer.height * 1;

              let offsetX = (map.width - layerWidth) / 2;
              let offsetY = (map.height - layerHeight) / 2;

              offsetX += -offsetX + layerX + mapXOffset;
              offsetY += offsetY + layerY + mapYOffset;

              const bounds = [[offsetY, offsetX], [layerHeight + offsetY, layerWidth + offsetX]];

              if (layer.nodes) {
                return layer.nodes.map(node => {
                  const nodeX = (node.x ? node.x : 0);
                  const nodeY = (node.y ? node.y : 0);
    
                  const nodeWidth = node.width * 1;
                  const nodeHeight = node.height * 1;
    
                  const nodeOffsetY = offsetY+(layerHeight-nodeHeight)/2+nodeY;
                  const nodeOffsetX = offsetX+(layerWidth-nodeWidth)/2+nodeX;
    
                  const bounds = [[nodeOffsetY, nodeOffsetX], [nodeHeight + nodeOffsetY, nodeWidth + nodeOffsetX]];
                  
                  return <ImageOverlay key={node.id} url={node.image} bounds={bounds} opacity={node.opacity || 1} />;
                });
              } else {
                return <ImageOverlay key={layer.id} url={layer.image} bounds={bounds} opacity={layer.opacity || 1} />;
              }
            })}
          {maps[destination].map.bubbles.map(bubble =>
            bubble.nodes
              .filter(node => node.type === 'title')
              .map((node, i) => {
                const markerOffsetX = mapXOffset + viewWidth / 2;
                const markerOffsetY = mapYOffset + map.height + -viewHeight / 2;

                const offsetX = markerOffsetX + (node.x ? node.x : 0);
                const offsetY = markerOffsetY + (node.y ? node.y : 0);

                const icon = marker.text(['interaction-none', bubble.type], bubble.name);

                return <Marker key={i} position={[offsetY, offsetX]} icon={icon} />;
              })
          )}
          {this.state.checklists.map(checklist => {
            return checklist.items.map(node => {
              const markerOffsetX = mapXOffset + viewWidth / 2;
              const markerOffsetY = mapYOffset + map.height + -viewHeight / 2;

              const offsetX = markerOffsetX + (node.map.x ? node.map.x : 0);
              const offsetY = markerOffsetY + (node.map.y ? node.map.y : 0);

              const icon = marker.icon([node.completed ? 'completed' : ''], checklist.icon);
              // const icon = marker.text(['debug'], `${checklist.name}: ${node.name}`);

              return <Marker key={node.itemHash} position={[offsetY, offsetX]} icon={icon} />;
            });
          })}
        </Map>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    member: state.member,
    collectibles: state.collectibles
  };
}

function mapDispatchToProps(dispatch) {
  return {
    rebindTooltips: value => {
      dispatch({ type: 'REBIND_TOOLTIPS', payload: new Date().getTime() });
    }
  };
}

export default compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  ),
  withTranslation()
)(Maps);
