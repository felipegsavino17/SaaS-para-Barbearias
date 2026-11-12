"use client"

import Image from "next/image"
import {
  BarbershopService,
  type Barbershop,
  type Booking,
} from "@prisma/client"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet"
import { Calendar } from "./ui/calendar"
import { ptBR } from "date-fns/locale"
import { useEffect, useMemo, useState } from "react"
import { format, isPast, isToday, set, startOfToday } from "date-fns"
import { toast } from "sonner"
import { createBooking } from "../_actions/create-booking"
import { useSession } from "next-auth/react"
import { getBookings } from "../_actions/get-bookings"
import { Dialog, DialogContent } from "./ui/dialog"
import SignInDialog from "./sign-in-dialog"

interface ServiceItemProps {
  service: BarbershopService
  barbershop: Pick<Barbershop, "name">
}

const TIME_LIST = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
]

interface GetTimeListProps {
  bookings: Booking[]
  selectedDay: Date
}

const getTimeList = ({ bookings, selectedDay }: GetTimeListProps) => {
  return TIME_LIST.filter((time) => {
    const hour = Number(time.split(":")[0])
    const minutes = Number(time.split(":")[1])

    const timeIsOnThePast = isPast(set(new Date(), { hours: hour, minutes }))

    if (timeIsOnThePast && isToday(selectedDay)) {
      return false
    }

    const hasBookingOnCurrentTime = bookings.some(
      (booking) =>
        booking.date.getHours() === hour &&
        booking.date.getMinutes() === minutes,
    )

    if (hasBookingOnCurrentTime) {
      return false
    }

    return true
  })
}

const ServiceItem = ({ service, barbershop }: ServiceItemProps) => {
  const [signInDialogIsOpen, setSignInDialogIsOpen] = useState(false)
  const { data } = useSession()
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(undefined)
  const [selectedTime, setSelectedTime] = useState<string | undefined>(
    undefined,
  )

  const [dayBookings, setDayBookings] = useState<Booking[]>([])
  const [bookingSheetIsOpen, setBookingSheetIsOpen] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      if (!selectedDay) return

      const bookings = await getBookings({
        date: selectedDay,
        serviceId: service.id,
      })

      setDayBookings(bookings)
    }

    console.log("useEffect")
    fetch()
  }, [selectedDay, service.id])

  const handleBookingClick = () => {
    if (data?.user) {
      return setBookingSheetIsOpen(true)
    }

    return setSignInDialogIsOpen(true)
  }

  const handleBookingSheetOpenChange = () => {
    setSelectedDay(undefined)
    setSelectedTime(undefined)
    setDayBookings([])
    setBookingSheetIsOpen(false)
  }

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDay(date)
    setSelectedTime(undefined)
  }

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time)
  }

  const handleCreateBooking = async () => {
    try {
      if (!selectedDay || !selectedTime) return

      const hour = Number(selectedTime.split(":")[0])
      const minute = Number(selectedTime.split(":")[1])

      const newDate = set(selectedDay, {
        minutes: minute,
        hours: hour,
      })

      console.log("DADOS DA SESSÃO:", data)
      console.log("ID DO USUÁRIO:", (data?.user as any)?.id)

      await createBooking({
        serviceId: service.id,
        date: newDate,
      })

      handleBookingSheetOpenChange()
      toast.success("Reserva criada com sucesso!")
    } catch (error) {
      console.error(error)
      toast.error("Erro ao criar reserva!")
    }
  }

  const timeList = useMemo(() => {
    if (!selectedDay) return []

    return getTimeList({
      bookings: dayBookings,
      selectedDay,
    })
  }, [dayBookings, selectedDay])

  return (
    <>
      <Card>
        <CardContent className="flex items-center gap-3 p-3">
          <div className="relative max-h-[110px] min-h-[110px] min-w-[110px] max-w-[110px]">
            <Image
              src={service.imageUrl}
              alt={service.name}
              fill
              className="rounded-lg object-cover"
            />
          </div>

          <div className="min-w-0 flex-1 space-y-2">
            <h3 className="text-sm font-semibold">{service.name}</h3>
            <p className="text-sm text-gray-400">{service.description}</p>

            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-bold text-primary">
                {Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(Number(service.price))}
              </p>

              <Sheet
                open={bookingSheetIsOpen}
                onOpenChange={handleBookingSheetOpenChange}
              >
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleBookingClick}
                >
                  Reservar
                </Button>

                <SheetContent className="flex h-dvh flex-col gap-0 overflow-hidden px-0 py-4">
                  <SheetHeader className="shrink-0 px-5 pb-3">
                    <SheetTitle>Fazer Reserva</SheetTitle>
                  </SheetHeader>

                  <div className="flex min-h-0 flex-1 flex-col">
                    <div className="shrink-0 border-b border-solid py-2">
                      <Calendar
                        mode="single"
                        locale={ptBR}
                        selected={selectedDay}
                        onSelect={handleDateSelect}
                        disabled={{ before: startOfToday() }}
                        styles={{
                          weekday: {
                            width: "100%",
                            textTransform: "capitalize",
                          },
                          day: {
                            width: "100%",
                          },
                          day_button: {
                            width: "100%",
                          },
                          button_previous: {
                            width: "32px",
                            height: "32px",
                          },
                          button_next: {
                            width: "32px",
                            height: "32px",
                          },
                          month_caption: {
                            textTransform: "capitalize",
                          },
                        }}
                      />
                    </div>

                    {selectedDay && (
                      <div className="flex shrink-0 gap-2 overflow-x-auto border-b border-solid p-3 [&::-webkit-scrollbar]:hidden">
                        {timeList.length > 0 ? (
                          timeList.map((time) => (
                            <Button
                              key={time}
                              variant={
                                selectedTime === time ? "default" : "outline"
                              }
                              className="shrink-0 rounded-full"
                              size="sm"
                              onClick={() => handleTimeSelect(time)}
                            >
                              {time}
                            </Button>
                          ))
                        ) : (
                          <p className="text-xs">
                            Não há horários disponíveis para esta data.
                          </p>
                        )}
                      </div>
                    )}

                    {selectedTime && selectedDay && (
                      <div className="min-h-0 flex-1 p-3">
                        <Card>
                          <CardContent className="space-y-3 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <h2 className="font-bold">{service.name}</h2>
                              <p className="shrink-0 text-sm font-bold">
                                {Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                }).format(Number(service.price))}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <h2 className="text-sm text-gray-400">Data</h2>
                              <p className="text-right text-sm">
                                {format(selectedDay, "dd 'de' MMMM", {
                                  locale: ptBR,
                                })}{" "}
                                - {selectedTime}
                              </p>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <h2 className="text-sm text-gray-400">Horário</h2>
                              <p className="text-sm">{selectedTime}</p>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <h2 className="text-sm text-gray-400">
                                Barbearia
                              </h2>
                              <p className="text-right text-sm">
                                {barbershop.name}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>

                  <SheetFooter className="mt-auto shrink-0 border-t px-5 pt-3">
                    <Button
                      className="w-full"
                      onClick={handleCreateBooking}
                      disabled={!selectedDay || !selectedTime}
                    >
                      Confirmar
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={signInDialogIsOpen}
        onOpenChange={(open) => setSignInDialogIsOpen(open)}
      >
        <DialogContent className="w-[90%]">
          <SignInDialog />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ServiceItem
