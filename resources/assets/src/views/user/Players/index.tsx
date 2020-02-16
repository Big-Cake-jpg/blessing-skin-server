import React, { useState, useEffect } from 'react'
import { hot } from 'react-hot-loader/root'
import { t } from '@/scripts/i18n'
import * as fetch from '@/scripts/net'
import { showModal, toast } from '@/scripts/notify'
import useTexture from '@/scripts/hooks/useTexture'
import { Player } from '@/scripts/types'
import Loading from '@/components/Loading'
import Row from './Row'
import Previewer from './Previewer'
import ModalAddPlayer from './ModalAddPlayer'
import ModalReset from './ModalReset'

const Players: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selected, setSelected] = useState(0)
  const [skin, setSkin] = useTexture()
  const [cape, setCape] = useTexture()
  const [search, setSearch] = useState('')
  const [showModalAddPlayer, setShowModalAddPlayer] = useState(false)
  const [showModalReset, setShowModalReset] = useState(false)

  const selectPlayer = (player: Player) => {
    setSelected(player.pid)
    setSkin(player.tid_skin)
    setCape(player.tid_cape)
  }

  useEffect(() => {
    const getPlayers = async () => {
      setIsLoading(true)
      const { data } = await fetch.get<fetch.ResponseBody<Player[]>>(
        '/user/player/list',
      )
      setPlayers(data)
      if (data.length === 1) {
        selectPlayer(data[0])
      }
      setIsLoading(false)
    }
    getPlayers()
  }, [])

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
  }

  const handleAdd = (player: Player) => {
    setPlayers(players => [...players, player])
  }

  const editName = async (player: Player, index: number) => {
    let name: string
    try {
      const { value } = await showModal({
        mode: 'prompt',
        text: t('user.changePlayerName'),
        input: player.name,
        validator: (value: string) => {
          if (!value) {
            return t('user.emptyPlayerName')
          }
        },
      })
      name = value
    } catch {
      return
    }

    const { code, message } = await fetch.post<fetch.ResponseBody>(
      `/user/player/rename/${player.pid}`,
      { name },
    )
    if (code === 0) {
      toast.success(message)
      setPlayers(players => {
        players[index] = { ...player, name }
        return players.slice()
      })
    } else {
      toast.error(message)
    }
  }

  const resetTexture = async (skin: boolean, cape: boolean) => {
    if (!skin && !cape) {
      toast.warning(t('user.noClearChoice'))
      return
    }

    const { code, message } = await fetch.post<fetch.ResponseBody>(
      `/user/player/texture/clear/${selected}`,
      { type: [skin && 'skin', cape && 'cape'].filter(Boolean) },
    )
    if (code === 0) {
      toast.success(message)
      if (skin) {
        setSkin(0)
      }
      if (cape) {
        setCape(0)
      }
      setPlayers(players => {
        const index = players.findIndex(player => player.pid === selected)
        const player = Object.assign({}, players[index])
        if (skin) {
          player.tid_skin = 0
        }
        if (cape) {
          player.tid_cape = 0
        }
        players[index] = player
        return players.slice()
      })
    } else {
      toast.error(message)
    }
  }

  const deletePlayer = async (player: Player) => {
    try {
      await showModal({
        title: t('user.deletePlayer'),
        text: t('user.deletePlayerNotice'),
        okButtonType: 'danger',
      })
    } catch {
      return
    }

    const { code, message } = await fetch.post<fetch.ResponseBody>(
      `/user/player/delete/${player.pid}`,
    )
    if (code === 0) {
      toast.success(message)
      const { pid } = player
      setPlayers(players => players.filter(player => player.pid !== pid))
    } else {
      toast.error(message)
    }
  }

  const openModalAddPlayer = () => setShowModalAddPlayer(true)
  const closeModalAddPlayer = () => setShowModalAddPlayer(false)

  const openModalReset = () => setShowModalReset(true)
  const closeModalReset = () => setShowModalReset(false)

  return (
    <>
      <div className="card">
        <div className="card-header">
          <input
            type="text"
            className="form-control"
            placeholder={t('user.typeToSearch')}
            onChange={handleSearch}
          />
        </div>
        <div className="card-body p-0 table-responsive">
          <table className="table table-hover">
            <thead>
              <tr>
                <th style={{ width: '12%' }}>PID</th>
                <th>{t('general.player.player-name')}</th>
                <th style={{ width: '50%' }}>{t('user.player.operation')}</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td className="text-center" colSpan={3}>
                    {isLoading ? <Loading /> : 'Nothing here.'}
                  </td>
                </tr>
              ) : (
                players
                  .filter(({ name }) => name.includes(search))
                  .map((player, i) => (
                    <Row
                      key={player.pid}
                      player={player}
                      selected={selected === player.pid}
                      onClick={() => selectPlayer(player)}
                      onEditName={() => editName(player, i)}
                      onReset={openModalReset}
                      onDelete={deletePlayer}
                    />
                  ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer">
          <button className="btn btn-primary" onClick={openModalAddPlayer}>
            <i className="fas fa-plus mr-1"></i>
            <span>{t('user.player.add-player')}</span>
          </button>
        </div>
      </div>
      <Previewer
        skin={skin.url}
        cape={cape.url}
        isAlex={skin.type === 'alex'}
      />
      <ModalAddPlayer
        show={showModalAddPlayer}
        onAdd={handleAdd}
        onClose={closeModalAddPlayer}
      />
      <ModalReset
        show={showModalReset}
        onSubmit={resetTexture}
        onClose={closeModalReset}
      />
    </>
  )
}

export default hot(Players)
