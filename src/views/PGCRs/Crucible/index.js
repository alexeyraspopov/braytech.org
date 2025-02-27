import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';
import { withTranslation } from 'react-i18next';
import cx from 'classnames';

import * as bungie from '../../../utils/bungie';
import manifest from '../../../utils/manifest';
import Spinner from '../../../components/UI/Spinner';
import Mode from '../../../components/PGCRs/Mode';
import Matches from '../../../components/PGCRs/Matches';
import ParentModeLinks from '../ParentModeLinks';

class Crucible extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false
    };
  }

  crucible = {
    all: {
      modes: [5, 69, 70],
      stats: {
        allPvP: {
          mode: 5
        },
        pvpCompetitive: {
          mode: 69
        },
        pvpQuickplay: {
          mode: 70
        }
      }
    },
    competitive: {
      modes: [72, 74, 37, 38],
      stats: {
        clashCompetitive: {
          mode: 72
        },
        controlCompetitive: {
          mode: 74
        },
        countdown: {
          mode: 38
        },
        survival: {
          mode: 37
        }
      }
    },
    quickplay: {
      modes: [71, 73, 43, 48, 60, 65, 59],
      stats: {
        clashQuickplay: {
          mode: 71
        },
        controlQuickplay: {
          mode: 73
        },
        ironBannerControl: {
          mode: 43
        },
        rumble: {
          mode: 48
        },
        lockdown: {
          mode: 60
        },
        breakthrough: {
          mode: 65
        },
        showdown: {
          mode: 59
        }
      }
    }
  };

  fetch = async () => {
    const { member } = this.props;

    this.setState(p => ({
      ...p,
      loading: true
    }));

    let [stats_allPvP, stats_competitive, stats_quickplay] = await Promise.all([
      bungie.GetHistoricalStats(member.membershipType, member.membershipId, member.characterId, '1', this.crucible.all.modes, '0'),
      bungie.GetHistoricalStats(member.membershipType, member.membershipId, member.characterId, '1', this.crucible.competitive.modes, '0'),
      bungie.GetHistoricalStats(member.membershipType, member.membershipId, member.characterId, '1', this.crucible.quickplay.modes, '0')
    ]);

    stats_allPvP = (stats_allPvP && stats_allPvP.ErrorCode === 1 && stats_allPvP.Response) || [];
    stats_competitive = (stats_competitive && stats_competitive.ErrorCode === 1 && stats_competitive.Response) || [];
    stats_quickplay = (stats_quickplay && stats_quickplay.ErrorCode === 1 && stats_quickplay.Response) || [];

    for (const mode in stats_allPvP) {
      if (stats_allPvP.hasOwnProperty(mode)) {
        if (!stats_allPvP[mode].allTime) {
          return;
        }
        Object.entries(stats_allPvP[mode].allTime).forEach(([key, value]) => {
          this.crucible.all.stats[mode][key] = value;
        });
      }
    }

    for (const mode in stats_competitive) {
      if (stats_competitive.hasOwnProperty(mode)) {
        if (!stats_competitive[mode].allTime) {
          return;
        }
        Object.entries(stats_competitive[mode].allTime).forEach(([key, value]) => {
          this.crucible.competitive.stats[mode][key] = value;
        });
      }
    }

    for (const mode in stats_quickplay) {
      if (stats_quickplay.hasOwnProperty(mode)) {
        if (!stats_quickplay[mode].allTime) {
          return;
        }
        Object.entries(stats_quickplay[mode].allTime).forEach(([key, value]) => {
          this.crucible.quickplay.stats[mode][key] = value;
        });
      }
    }

    this.setState(p => ({
      ...p,
      loading: false
    }));

    return true;
  };

  componentDidMount() {
    this.refreshData();
    this.startInterval();
  }

  refreshData = async () => {
    if (!this.state.loading) {
      //console.log('refresh start');
      await this.fetch();
      //console.log('refresh end');
    } else {
      //console.log('refresh skipped');
    }
  };

  startInterval() {
    this.refreshDataInterval = window.setInterval(this.refreshData, 30000);
  }

  clearInterval() {
    window.clearInterval(this.refreshDataInterval);
  }

  componentWillUnmount() {
    this.clearInterval();
  }

  render() {
    const { t, member } = this.props;
    
    const offset = parseInt(this.props.offset);

    const characterId = member.characterId;

    const characterProgressions = member.data.profile.characterProgressions.data;
    const profileRecords = member.data.profile.profileRecords.data.records;

    const valor = {
      defs: {
        rank: manifest.DestinyProgressionDefinition[3882308435],
        activity: manifest.DestinyActivityDefinition[2274172949]
      },
      progression: {
        data: characterProgressions[characterId].progressions[3882308435],
        total: 0,
        resets: profileRecords[559943871] ? profileRecords[559943871].objectives[0].progress : 0
      }
    };

    valor.progression.total = Object.keys(valor.defs.rank.steps).reduce((sum, key) => {
      return sum + valor.defs.rank.steps[key].progressTotal;
    }, 0);

    const glory = {
      defs: {
        rank: manifest.DestinyProgressionDefinition[2679551909],
        activity: manifest.DestinyActivityDefinition[2947109551]
      },
      progression: {
        data: characterProgressions[characterId].progressions[2679551909],
        total: 0
      }
    };

    glory.progression.total = Object.keys(glory.defs.rank.steps).reduce((sum, key) => {
      return sum + glory.defs.rank.steps[key].progressTotal;
    }, 0);

    return (
      <div className={cx('view', 'crucible')} id='multiplayer'>
        <div className='module-l1'>
          <div className='module-l2'>
            <div className='content head'>
              <div className='page-header'>
                <div className='sub-name'>{t('Post Game Carnage Reports')}</div>
                <div className='name'>{t('Crucible')}</div>
              </div>
            </div>
          </div>
          <div className='module-l2'>
            <ParentModeLinks />
          </div>
          <div className='module-l2'>
            <div className='sub-header'>
              <div>{t('Summative modes')}</div>
            </div>
            <div className='content'>
              {Object.values(this.crucible.all.stats.allPvP).length > 1 ? (
                <ul className='list modes'>
                  {Object.values(this.crucible.all.stats).map(m => {
                    let paramsMode = this.props.mode ? parseInt(this.props.mode) : 5;
                    let isActive = (match, location) => {
                      if (paramsMode === m.mode) {
                        return true;
                      } else {
                        return false;
                      }
                    };

                    return <Mode key={m.mode} stats={m} isActive={isActive} root='/reports/crucible' />;
                  })}
                </ul>
              ) : (
                <Spinner mini />
              )}
            </div>
            <div className='sub-header'>
              <div>{t('Glory modes')}</div>
            </div>
            <div className='content'>
              {Object.values(this.crucible.all.stats.allPvP).length > 1 ? (
                <ul className='list modes'>
                  {Object.values(this.crucible.competitive.stats).map(m => {
                    let paramsMode = this.props.mode ? parseInt(this.props.mode) : 5;
                    let isActive = (match, location) => {
                      if (paramsMode === m.mode) {
                        return true;
                      } else {
                        return false;
                      }
                    };

                    return <Mode key={m.mode} stats={m} isActive={isActive} root='/reports/crucible' />;
                  })}
                </ul>
              ) : (
                <Spinner mini />
              )}
            </div>
            <div className='sub-header'>
              <div>{t('Valor modes')}</div>
            </div>
            <div className='content'>
              {Object.values(this.crucible.all.stats.allPvP).length > 1 ? (
                <ul className='list modes'>
                  {Object.values(this.crucible.quickplay.stats).map(m => {
                    let paramsMode = this.props.mode ? parseInt(this.props.mode) : 5;
                    let isActive = (match, location) => {
                      if (paramsMode === m.mode) {
                        return true;
                      } else {
                        return false;
                      }
                    };

                    return <Mode key={m.mode} stats={m} isActive={isActive} root='/reports/crucible' />;
                  })}
                </ul>
              ) : (
                <Spinner mini />
              )}
            </div>
          </div>
        </div>
        <div className='module-l1' id='matches'>
          <div className='sub-header'>
            <div>{t('Recent matches')}</div>
          </div>
          <div className='content'>
            <Matches mode={this.props.mode ? parseInt(this.props.mode) : 5} characterId={member.characterId} limit='10' offset={offset} root='/reports/crucible' />
          </div>
        </div>
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    member: state.member,
    PGCRcache: state.PGCRcache
  };
}

export default compose(
  connect(mapStateToProps),
  withTranslation()
)(Crucible);
